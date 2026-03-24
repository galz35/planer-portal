import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({ userRouter: t.router({ getUser: publicProcedure.input(z.object({ id: z.number() })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any) }) });
export type AppRouter = typeof appRouter;

