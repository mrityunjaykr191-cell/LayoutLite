export const config = {
  runtime: 'nodejs',
};

export async function POST(request: Request) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'remove.bg API key is not configured',
        detail: 'Set REMOVE_BG_API_KEY in your Vercel project Environment Variables.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return new Response(
        JSON.stringify({
          error: 'Empty or invalid file',
          detail: 'No photo was provided in the upload request.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file', file, 'photo.jpg');
    removeBgFormData.append('size', 'auto');

    const upstreamResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgFormData,
    });

    if (!upstreamResponse.ok) {
      const status = upstreamResponse.status;
      let errorDetail = 'remove.bg rejected the request';
      try {
        const errorJson = (await upstreamResponse.json()) as {
          errors?: Array<{ title?: string }>;
        };
        if (errorJson.errors && errorJson.errors[0]?.title) {
          errorDetail = errorJson.errors[0].title;
        }
      } catch {
        // Response was not JSON
      }

      if (status === 401 || status === 403) {
        errorDetail = 'remove.bg rejected the API key. Please verify REMOVE_BG_API_KEY in Vercel settings.';
      } else if (status === 402) {
        errorDetail = 'Insufficient remove.bg processing credits.';
      } else if (status === 429) {
        errorDetail = 'remove.bg rate limit reached. Please wait a moment.';
      }

      return new Response(
        JSON.stringify({
          error: 'Background removal failed',
          detail: errorDetail,
        }),
        {
          status: status === 401 || status === 403 ? 503 : status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const pngBuffer = await upstreamResponse.arrayBuffer();
    return new Response(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(
      JSON.stringify({
        error: 'Background removal failed',
        detail: `Serverless error: ${errorMsg}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
