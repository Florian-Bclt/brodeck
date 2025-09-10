import withAuth, { NextRequestWithAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    // Anti-indexation staging sur test.coursinfirmier.fr
    const host = req.headers.get('host') ?? ''
    const isStaging = host.includes("test.brodeck.fr")

    const { pathname, search, href } = req.nextUrl;
    const token: any = req.nextauth?.token;
    const role: string | undefined = token?.role;

    // Helper pour fabriquer une redirection tout en gardant l'anti-indexation
    const withRobots = (res: NextResponse) => {
      if (isStaging) res.headers.set('X-Robots-Tag', "noindex, nofollow");
      return res;
    };

    // Garde "noindex" pour le staging sur toutes les réponses
    const pass = withRobots(NextResponse.next());

    // Règle de rôles (utilisateurs déjà authentifié)
    // admin area
    if (pathname.startsWith('/dashboard/admin')) {
      if (role !== 'ADMIN') {
        // Si c'est un étudiant/abonné connecté => redirige vers son dashboard
        if (role && ['CLIENT'].includes(role)) {
          return withRobots(NextResponse.redirect(new URL("/dashboard/client", req.url)));
        }
        // Sinon => login avec callbackUrl + next
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', href);
        loginUrl.searchParams.set('next', pathname + search);
        return withRobots(NextResponse.redirect(loginUrl));
      }
      return pass;
    }

    // Student area
    if (pathname.startsWith('/dashboard/client')) {
      if (!role || !role === 'CLIENT'.includes(role)) {
        // Un admin connecté qui tente /dashboard/student => renvoie vers /dashboard/admin
        if (role === 'ADMIN') {
          return withRobots(NextResponse.redirect(new URL('/dashboard/client', req.url)));
        }
        // Sinon => login avec callbackUrl + next
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", href);
        loginUrl.searchParams.set("next", pathname + search);
        return withRobots(NextResponse.redirect(loginUrl));
      }
      return pass;
    }
    return pass;
  },
  {
    // Ici on délègue à withAuth la vérification "est-il authentifié ?"
    // Les rôles sont gérés dans la fonction ci-dessus (plus de contrôle).
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login", // withAuth ajoutera ?callbackUrl=...
    },
  }
);

export const config = {
    matcher: ["/dashboard/:path*"] // protège toutes les pages enfants de /dashboard
}