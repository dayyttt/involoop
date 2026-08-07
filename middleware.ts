import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CURRENCY_COOKIE, currencyForCountry } from "@/lib/currency-region";

// Everything under /dashboard needs an account. Without this the pages loaded
// for anyone: the dashboard rendered an error where its numbers should be, and
// the invoice creator let a visitor type a whole billing sentence, press the
// button, and only then told them to sign in. Deciding here means the answer
// arrives before the work does.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Resolve the visitor's currency from where they are, once, and remember it.
  // Vercel puts the country on every request, so this costs nothing and means
  // an American writing "bill Acme 500" gets USD instead of rupiah.
  if (!request.cookies.get(CURRENCY_COOKIE)) {
    const country = request.headers.get("x-vercel-ip-country") ?? request.geo?.country;
    response.cookies.set(CURRENCY_COOKIE, currencyForCountry(country), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Only the app pages need a session; the landing and the shared invoice
  // pages must stay open to anyone.
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.url);
    // Carry the destination so signing in returns them to what they wanted,
    // rather than dropping everyone on the dashboard.
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
