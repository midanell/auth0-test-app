import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    audience: process.env.AUTH0_AUDIENCE,
  },
  async onCallback(error, ctx) {
    if (error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return NextResponse.redirect(new URL("/dashboard", ctx.appBaseUrl));
  },
});
