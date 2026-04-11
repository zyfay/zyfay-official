import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1630',
            color: '#fff',
            border: '1px solid #2D2650',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#A855F7', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#fff' } },
        }}
      />
    </>
  );
}
