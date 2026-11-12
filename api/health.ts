export const config = {
  runtime: 'nodejs',
};

export async function GET() {
  const configured = Boolean(process.env.REMOVE_BG_API_KEY);
  return new Response(
    JSON.stringify({
      status: 'ok',
      ready: configured,
      model: 'remove.bg API',
      device: 'Cloud',
      error: configured
        ? undefined
        : 'Set REMOVE_BG_API_KEY in Vercel project Environment Variables.',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
