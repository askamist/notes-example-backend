import { Hono, type Context } from "hono";
import { prisma } from "../lib/prisma.js";
import { getAuth } from "@hono/clerk-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateRandomColor } from "../utils/colors.js";
import { analyzeAndTagNote } from "../utils/tagging.js";

const notesRouter = new Hono();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Get all notes for the authenticated user
notesRouter.get("/", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const notes = await prisma.note.findMany({
      where: {
        userId: auth.userId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return c.json(notes);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to fetch notes" }, 500);
  }
});

// Get shared notes
notesRouter.get("/shared", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const sharedNotes = await prisma.note.findMany({
      where: {
        OR: [
          {
            sharedWith: {
              some: {
                userId: auth.userId,
              },
            },
          },
          {
            team: {
              members: {
                some: {
                  userId: auth.userId,
                },
              },
            },
          },
        ],
      },
      include: {
        sharedWith: true,
        team: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return c.json(sharedNotes);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to fetch shared notes" }, 500);
  }
});

// Create a note
notesRouter.post("/", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const { title, content } = await c.req.json();

    if (!title || !content) {
      return c.json({ error: "Title and content are required" }, 400);
    }

    const note = await prisma.note.create({
      data: {
        title,
        content,
        userId: auth.userId,
      },
    });

    // Automatically analyze and tag the new note
    await analyzeAndTagNote(note.id);

    return c.json({ ...note, tags: [] }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create note" }, 500);
  }
});

// Get a single note
notesRouter.get("/:id", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const { id } = c.req.param();

    const note = await prisma.note.findFirst({
      where: {
        id,
        OR: [
          { userId: auth.userId },
          {
            sharedWith: {
              some: {
                userId: auth.userId,
              },
            },
          },
          {
            team: {
              members: {
                some: {
                  userId: auth.userId,
                },
              },
            },
          },
        ],
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    return c.json(note);
  } catch (error) {
    return c.json({ error: "Failed to fetch note" }, 500);
  }
});

// Update a note
notesRouter.put("/:id", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  try {
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (!existingNote) {
      return c.json({ message: "Note not found or unauthorized" }, 404);
    }

    const { title, content } = await c.req.json();

    if (!title && !content) {
      return c.json({ error: "Title or content is required" }, 400);
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
      },
    });

    // Automatically analyze and tag the updated note
    await analyzeAndTagNote(note.id);

    return c.json(note);
  } catch (error) {
    return c.json({ error: "Failed to update note" }, 500);
  }
});

// Delete a note
notesRouter.delete("/:id", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const id = c.req.param("id");
  try {
    // First verify the note belongs to the user
    const existingNote = await prisma.note.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (!existingNote) {
      return c.json({ message: "Note not found or unauthorized" }, 404);
    }

    await prisma.note.delete({
      where: { id },
    });
    return c.json({ message: "Note deleted" });
  } catch (error) {
    return c.json({ error: "Failed to delete note" }, 500);
  }
});

// Share note with a user
notesRouter.post("/:id/share", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const noteId = c.req.param("id");
  const { email, access } = await c.req.json();

  try {
    // Verify note ownership
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: auth.userId,
      },
    });

    if (!note) {
      return c.json({ error: "Note not found or unauthorized" }, 404);
    }

    // Find user by email using Clerk
    const clerkClient = c.get("clerk");
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
    });
    const targetUser = users.data[0];

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Create share record
    const shareRecord = await prisma.noteShare.create({
      data: {
        noteId,
        userId: targetUser.id,
        email,
        access: access || "view",
      },
    });

    return c.json(shareRecord, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to share note" }, 500);
  }
});

// Share note with a team
notesRouter.post("/:id/share-team", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const noteId = c.req.param("id");
  const { teamId } = await c.req.json();

  try {
    // Verify note ownership
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: auth.userId,
      },
    });

    if (!note) {
      return c.json({ error: "Note not found or unauthorized" }, 404);
    }

    // Verify team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: auth.userId,
      },
    });

    if (!teamMember) {
      return c.json({ error: "Team not found or not a member" }, 404);
    }

    // Update note with team
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { teamId },
    });

    return c.json(updatedNote, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to share note with team" }, 500);
  }
});

// Analyze tags endpoint (keep this for manual retagging if needed)
notesRouter.post("/:id/analyze-tags", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const noteId = c.req.param("id");

  try {
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId: auth.userId,
      },
    });

    if (!note) {
      return c.json({ error: "Note not found or unauthorized" }, 404);
    }

    const tags = await analyzeAndTagNote(noteId);
    return c.json(tags);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to analyze and create tags" }, 500);
  }
});

export default notesRouter;
