import { Hono, Context } from "hono";
import { prisma } from "../lib/prisma";
import { getAuth } from "@hono/clerk-auth";

const teamsRouter = new Hono();

// Create a team
teamsRouter.post("/", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const { name } = await c.req.json();

    if (!name) {
      return c.json({ error: "Team name is required" }, 400);
    }

    const team = await prisma.team.create({
      data: {
        name,
        ownerId: auth.userId,
        members: {
          create: {
            userId: auth.userId,
            email: auth.user?.emailAddresses[0]?.emailAddress || "",
            role: "owner",
          },
        },
      },
      include: {
        members: true,
      },
    });

    return c.json(team, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to create team" }, 500);
  }
});

// Get user's teams
teamsRouter.get("/", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: auth.userId,
          },
        },
      },
      include: {
        members: true,
      },
    });

    return c.json(teams);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to fetch teams" }, 500);
  }
});

// Add member to team
teamsRouter.post("/:teamId/members", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const teamId = c.req.param("teamId");
  const { email } = await c.req.json();

  try {
    // Check if user is team owner
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: auth.userId,
      },
    });

    if (!team) {
      return c.json({ error: "Team not found or unauthorized" }, 404);
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        teamId,
        email,
        userId: "", // This will be updated when user accepts invitation
        role: "member",
      },
    });

    return c.json(member, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to add team member" }, 500);
  }
});

// Remove member from team
teamsRouter.delete("/:teamId/members/:memberId", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const { teamId, memberId } = c.req.param();

  try {
    // Check if user is team owner
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: auth.userId,
      },
    });

    if (!team) {
      return c.json({ error: "Team not found or unauthorized" }, 404);
    }

    await prisma.teamMember.delete({
      where: {
        id: memberId,
        teamId,
      },
    });

    return c.json({ message: "Member removed" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to remove team member" }, 500);
  }
});

export default teamsRouter;
