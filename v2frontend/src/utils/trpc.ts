import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './trpc-router.ts/server';

export const trpc = createTRPCReact<AppRouter>();
