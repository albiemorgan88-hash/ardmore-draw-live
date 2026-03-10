import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Ardmore Cricket Club | Est. 1879",
  description: "Home of Ardmore Cricket Club, The Bleach Green, Ardmore, Co. Derry. North West Cricket Union. Founded 1879.",
  openGraph: {
    title: "Ardmore Cricket Club | Est. 1879",
    description: "Home of Ardmore Cricket Club, The Bleach Green. North West Cricket Union. Founded 1879. Support the club through our weekly draw!",
    url: "https://ardmorecricket.com",
    siteName: "Ardmore Cricket Club",
    images: [{ url: "https://ardmorecricket.com/ardmore-og.png", width: 512, height: 512, alt: "Ardmore Cricket Club Crest" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Ardmore Cricket Club | Est. 1879",
    description: "Home of Ardmore Cricket Club, The Bleach Green. North West Cricket Union. Founded 1879.",
    images: ["https://ardmorecricket.com/ardmore-og.png"],
  },
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <Navigation />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="bg-navy-dark text-white">
      {/* Contact Form */}
      <div className="bg-navy border-b border-navy-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h3 className="font-heading text-2xl font-bold text-center mb-2">Contact Us</h3>
          <p className="text-gray-300 text-center text-sm mb-6">Got a question? Want to join? Get in touch.</p>
          <form action="https://formsubmit.co/Ardmorecc1879@hotmail.com" method="POST" className="space-y-4">
            <input type="hidden" name="_subject" value="Ardmore CC Website Enquiry" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_next" value="https://ardmorecricket.com/?contacted=true" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" name="name" placeholder="Your Name" required className="w-full px-4 py-3 bg-navy-dark border border-navy-light rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold" />
              <input type="email" name="email" placeholder="Your Email" required className="w-full px-4 py-3 bg-navy-dark border border-navy-light rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold" />
            </div>
            <textarea name="message" placeholder="Your message..." rows={4} required className="w-full px-4 py-3 bg-navy-dark border border-navy-light rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold resize-none" />
            <div className="text-center">
              <button type="submit" className="bg-gold text-navy px-8 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors">Send Message</button>
            </div>
          </form>
          <p className="text-center text-gray-400 text-sm mt-4">Or email us directly at <a href="mailto:Ardmorecc1879@hotmail.com" className="text-gold hover:underline">Ardmorecc1879@hotmail.com</a></p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-heading text-xl font-bold mb-3">Ardmore Cricket Club</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              The Bleach Green<br />
              12 Green Road, Ardmore<br />
              BT47 3RG, Co. Derry
            </p>
            <p className="text-sm text-gold mt-2">Est. 1879</p>
            <a href="mailto:Ardmorecc1879@hotmail.com" className="text-sm text-gray-300 hover:text-gold transition-colors mt-1 block">Ardmorecc1879@hotmail.com</a>
          </div>
          <div>
            <h4 className="font-heading text-lg font-semibold mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-gray-300">
              <a href="/about" className="hover:text-gold transition-colors">About the Club</a>
              <a href="/committee" className="hover:text-gold transition-colors">Committee</a>
              <a href="/news" className="hover:text-gold transition-colors">Club News</a>
              <a href="/archive" className="hover:text-gold transition-colors">Archive</a>
              <a href="/draw" className="hover:text-gold transition-colors">Weekly Draw</a>
              <a href="/sponsors" className="hover:text-gold transition-colors">Sponsors</a>
              <a href="https://northwestcricket.com/clubs/ardmore-cricket-club/" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">NWCU Profile</a>
            </div>
          </div>
          <div>
            <h4 className="font-heading text-lg font-semibold mb-3">Follow Us</h4>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/ardmorecricketclub/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold transition-colors" aria-label="Instagram">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://twitter.com/Ardmore1879" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold transition-colors" aria-label="Twitter">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.facebook.com/ArdmoreCricketClub" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-gold transition-colors" aria-label="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>
        </div>
        {/* Supported By */}
        <div className="border-t border-navy-light mt-8 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Supported by</span>
            <img src="/images/derry-strabane-council.jpg" alt="Derry City & Strabane District Council" className="h-12 object-contain" />
          </div>
          <div className="text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Ardmore Cricket Club. All rights reserved.
            <div className="mt-2 space-x-4">
              <a href="/terms" className="hover:text-gold transition-colors">Terms &amp; Conditions</a>
              <a href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
