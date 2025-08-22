import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage = "Something went wrong!";
  let errorDetails = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorDetails = error.data || "No additional details available.";
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = "Please try refreshing the page or contact support.";
  }

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
        <title>Error - Papa Popup</title>
      </head>
      <body style={{ 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        margin: 0,
        padding: '40px 20px',
        backgroundColor: '#f6f6f7',
        color: '#202223'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ color: '#d72c0d', marginBottom: '16px' }}>
            {errorMessage}
          </h1>
          <p style={{ marginBottom: '24px', lineHeight: '1.5' }}>
            {errorDetails}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#008060',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Try Again
            </button>
            <a
              href="/app"
              style={{
                backgroundColor: '#f6f6f7',
                color: '#202223',
                textDecoration: 'none',
                border: '1px solid #c9cccf',
                padding: '12px 20px',
                borderRadius: '6px',
                display: 'inline-block'
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
