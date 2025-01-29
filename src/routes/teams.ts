import { prisma } from "../lib/prisma.js";
import { getAuth } from "@hono/clerk-auth";
import type {
  AuthContext,
  Team,
  TeamMember,
  TeamCreateInput,
} from "../types/index.js";
import { Hono, type Context } from "hono";
const teamsRouter = new Hono();

// Create a team
teamsRouter.post("/", async (c: Context) => {
  const auth = getAuth(c) as AuthContext;
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const { name } = await c.req.json();

    if (!name) {
      return c.json({ error: "Team name is required" }, 400);
    }

    const teamInput: TeamCreateInput = {
      name,
      ownerId: auth.userId,
      ownerEmail: auth.user?.emailAddresses[0]?.emailAddress || "",
    };

    const team = await prisma.team.create({
      data: {
        name: teamInput.name,
        ownerId: teamInput.ownerId,
        members: {
          create: {
            userId: teamInput.ownerId,
            email: teamInput.ownerEmail,
            role: "owner",
          },
        },
      },
      include: {
        members: true,
      },
    });

    return c.json(team as Team, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to create team" }, 500);
  }
});

// Get user's teams
teamsRouter.get("/", async (c: Context) => {
  const auth = getAuth(c) as AuthContext;
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  try {
    const [ownedTeams, memberTeams] = await Promise.all([
      // Get teams owned by user
      prisma.team.findMany({
        where: {
          ownerId: auth.userId,
        },
        include: {
          members: true,
        },
      }),
      // Get teams where user is a member but not owner
      prisma.team.findMany({
        where: {
          AND: [
            {
              members: {
                some: {
                  userId: auth.userId,
                },
              },
            },
            {
              ownerId: {
                not: auth.userId,
              },
            },
          ],
        },
        include: {
          members: true,
        },
      }),
    ]);

    return c.json({
      ownedTeams,
      memberTeams,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to fetch teams" }, 500);
  }
});

// Get a single team
teamsRouter.get("/:teamId", async (c: Context) => {
  const auth = getAuth(c) as AuthContext;
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const teamId = c.req.param("teamId");

  try {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
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

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    return c.json(team as Team);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to fetch team" }, 500);
  }
});

// Add member to team
teamsRouter.post("/:teamId/members", async (c: Context) => {
  const auth = getAuth(c) as AuthContext;
  const clerkClient = c.get("clerk");
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const teamId = c.req.param("teamId");
  const { email } = await c.req.json();

  const user = (await clerkClient.users.getUserList({ emailAddress: [email] }))
    .data[0];

  if (!user) {
    return c.json({ error: "Could not find user with email" }, 404);
  }

  try {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: auth.userId,
      },
    });

    if (!team) {
      return c.json({ error: "Team not found or unauthorized" }, 404);
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        email,
        role: "member",
        userId: user.id,
      },
    });

    return c.json(member as TeamMember, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to add team member" }, 500);
  }
});

// Remove member from team
teamsRouter.delete("/:teamId/members/:memberId", async (c: Context) => {
  const auth = getAuth(c) as AuthContext;
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const { teamId, memberId } = c.req.param();

  try {
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

// Add DELETE team endpoint
teamsRouter.delete("/:id", async (c: Context) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const teamId = c.req.param("id");

  try {
    // Verify team ownership
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: auth.userId,
      },
    });

    if (!team) {
      return c.json({ error: "Team not found or unauthorized" }, 404);
    }

    // Delete all team members first
    await prisma.teamMember.deleteMany({
      where: { teamId },
    });

    // Delete the team
    await prisma.team.delete({
      where: { id: teamId },
    });

    return c.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return c.json({ error: "Failed to delete team" }, 500);
  }
});

export default teamsRouter;
