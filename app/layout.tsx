export const metadata = {
  title: "Involoop",
  description: "Invoicing untuk freelancer yang menyebar sendiri lewat setiap tagihan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#fafaf9" }}>
        {children}
      </body>
    </html>
  );
}
