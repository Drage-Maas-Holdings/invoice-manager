import { defineMiddleware } from 'astro/middleware';
import { COOKIE_NAME, verifySessionToken } from './lib/session';

export const onRequest = defineMiddleware(async (context, next) => {
  const cookie = context.cookies.get(COOKIE_NAME)?.value;
  context.locals.actor = cookie ? verifySessionToken(cookie) : null;

  const { pathname } = context.url;

  if (pathname.startsWith('/api/staff/')) {
    if (!context.locals.actor || context.locals.actor.actor_type !== 'staff') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if (pathname.startsWith('/api/vendor/')) {
    if (!context.locals.actor || context.locals.actor.actor_type !== 'vendor') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  if ((pathname === '/vendor' || pathname.startsWith('/vendor/')) && pathname !== '/vendor/login') {
    if (!context.locals.actor || context.locals.actor.actor_type !== 'vendor') {
      return context.redirect('/vendor/login', 302);
    }
  }

  if ((pathname === '/staff' || pathname.startsWith('/staff/')) && pathname !== '/staff/login') {
    if (!context.locals.actor || context.locals.actor.actor_type !== 'staff') {
      return context.redirect('/staff/login', 302);
    }
  }

  return next();
});
