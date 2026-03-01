import Image from "next/image";

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center">
        <Image src="/images/ground-1.jpg" alt="The Bleach Green with clubhouse" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-navy-dark/60" />
        <div className="relative text-center text-white px-4">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">About Ardmore CC</h1>
          <p className="text-gold text-lg">Cricket in the North West since 1879</p>
        </div>
      </section>

      {/* History */}
      <section className="py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-6">Our History</h2>
          <div className="prose prose-lg max-w-none text-navy/80">
            <p>
              Founded in 1879, Ardmore Cricket Club is one of the oldest cricket clubs in the North West of Ireland. 
              Playing in the club colours of Blue and Sky Blue, the club competes in the North West Cricket Union.
            </p>
            <p>
              Our home ground, The Bleach Green, sits at 10 Green Road, Ardmore, BT47 3RG, Co. Derry — 
              a stunning setting with the Sperrin Mountains as a backdrop that has hosted cricket for well over a century.
            </p>
          </div>
        </div>
      </section>

      {/* Honours */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-8">Honours</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-cream rounded-lg p-6 border-l-4 border-gold">
              <div className="text-gold font-heading text-2xl font-bold">2023</div>
              <div className="text-navy font-semibold text-lg mt-1">North West Senior League</div>
            </div>
            <div className="bg-cream rounded-lg p-6 border-l-4 border-gold">
              <div className="text-gold font-heading text-2xl font-bold">1994</div>
              <div className="text-navy font-semibold text-lg mt-1">North West Senior Cup</div>
            </div>
          </div>
        </div>
      </section>

      {/* Teams */}
      <section className="py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-8">Our Teams</h2>
          <p className="text-navy/70 mb-6">Captain: <span className="font-semibold text-navy">Rachit Gaur</span></p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {["1st XI", "2nd XI", "3rd XI", "Midweek XI", "U13", "U11"].map(team => (
              <div key={team} className="bg-white rounded-lg p-4 text-center shadow-sm border border-gray-100">
                <div className="font-heading text-xl font-bold text-navy">{team}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-8">Facilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Club House",
              "Changing rooms & showers",
              "Off Pitch net",
              "2 Cricket Pitches",
              "2 All weather match playing surfaces",
              "Floodlit training area",
              "Function Room",
              "Kitchen Facilities"
            ].map(f => (
              <div key={f} className="flex items-center gap-3 p-3">
                <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                <span className="text-navy/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training */}
      <section className="py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-8">Training Times</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-heading text-xl font-bold text-navy mb-2">Adults (14+)</h3>
              <p className="text-navy/70">Tuesday & Friday</p>
              <p className="text-navy font-semibold">6:30 – 8:30 PM</p>
              <p className="text-sm text-navy/50 mt-1">April – August</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-heading text-xl font-bold text-navy mb-2">Juniors (U14)</h3>
              <p className="text-navy/70">Monday</p>
              <p className="text-navy font-semibold">6:30 – 7:30 PM</p>
              <p className="text-sm text-navy/50 mt-1">April – August</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Photo */}
      <section className="relative h-[40vh] min-h-[250px]">
        <Image src="/images/community-1.jpg" alt="Ardmore community" fill className="object-cover" />
        <div className="absolute inset-0 bg-navy-dark/40" />
        <div className="relative h-full flex items-center justify-center">
          <a href="/draw" className="bg-gold text-navy font-bold px-10 py-4 rounded-md text-lg hover:bg-gold-light transition-colors">
            Support Your Club — Join the Draw
          </a>
        </div>
      </section>
    </>
  );
}
