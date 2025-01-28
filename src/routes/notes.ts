import { Hono, type Context } from "hono";
import { prisma } from "../lib/prisma.js";
import { getAuth } from "@hono/clerk-auth";

const notesRouter = new Hono();

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

    return c.json(note, 201);
  } catch (error) {
    return c.json({ error: "Failed to create note" }, 500);
  }
});

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

// Get a single note
notesRouter.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const note = await prisma.note.findUnique({
      where: { id },
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

export default notesRouter;
