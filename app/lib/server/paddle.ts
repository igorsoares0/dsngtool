import "server-only";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

// Server-side Paddle SDK instance, used to verify webhooks and look up customers.
const env =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? Environment.production
    : Environment.sandbox;

export const paddle = new Paddle(process.env.PADDLE_API_KEY ?? "", {
  environment: env,
});
