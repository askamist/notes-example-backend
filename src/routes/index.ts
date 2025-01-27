import { Context, Hono } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import notesRouter from "./notes";
import teamsRouter from "./teams";
const apiRouter = new Hono();

apiRouter.use("*", clerkMiddleware());

apiRouter.route("/notes", notesRouter);
apiRouter.route("/teams", teamsRouter);

// Add your protected routes here
apiRouter.get("/user", (c: Context) => {
  const auth = getAuth(c);

  if (!auth?.userId) {
    return c.json(
      {
        message: "You are not logged in.",
      },
      401
    );
  }

  return c.json({
    message: "You are logged in!",
    userId: auth.userId,
  });
});

export default apiRouter;
