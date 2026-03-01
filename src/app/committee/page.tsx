import Image from "next/image";

export const metadata = {
  title: "Office Bearers & Committee | Ardmore Cricket Club",
  description: "Meet the committee and team captains of Ardmore Cricket Club, est. 1879.",
};

export default function CommitteePage() {
  const officeBearers = [
    { role: "Chairman", name: "Dermot Ward" },
    { role: "President", name: "George Chambers" },
    { role: "Treasurer", name: "Kevin Brolly" },
    { role: "Secretary", name: "George Brolly" },
  ];

  const teams = [
    { name: "1st XI", captain: "Harry Zimmerman" },
    { name: "2nd XI", captain: "Vivek Sheroan" },
    { name: "3rd XI", captain: "Steven Barrow" },
    { name: "Midweek XI", captain: "Mark Chambers" },
    { name: "U13", captain: null },
    { name: "U11", captain: null },
  ];

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px]">
        <Image src="/images/team-1.jpg" alt="Ardmore Cricket Club squad" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-navy/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-2">Office Bearers</h1>
            <p className="text-gold text-lg">The people behind the club</p>
          </div>
        </div>
      </section>

      {/* Office Bearers */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-2 text-center">Club Committee</h2>
          <p className="text-navy/60 text-center mb-10">Guiding Ardmore Cricket Club since 1879</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {officeBearers.map(bearer => (
              <div key={bearer.role} className="bg-cream rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-navy rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-gold text-2xl font-heading font-bold">{bearer.name.charAt(0)}</span>
                </div>
                <div className="font-heading text-xl font-bold text-navy mb-1">{bearer.name}</div>
                <div className="text-gold font-semibold text-sm uppercase tracking-wider">{bearer.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Captains */}
      <section className="py-16 bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-2 text-center">Team Captains</h2>
          <p className="text-navy/60 text-center mb-10">Leading the charge on the field</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {teams.map(team => (
              <div key={team.name} className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="font-heading text-2xl font-bold text-navy mb-1">{team.name}</div>
                {team.captain ? (
                  <div className="text-navy/70">
                    <span className="text-gold text-sm font-semibold">Captain: </span>
                    {team.captain}
                  </div>
                ) : (
                  <div className="text-navy/40 text-sm italic">TBC</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Info */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-navy mb-8 text-center">Training</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-cream rounded-xl p-6 border border-gray-100">
              <h3 className="font-heading text-xl font-bold text-navy mb-3">Adult Training (14+)</h3>
              <p className="text-navy/70">Tuesday & Friday</p>
              <p className="text-navy/70">6:30 – 8:30pm</p>
              <p className="text-gold font-semibold mt-2">April – August</p>
            </div>
            <div className="bg-cream rounded-xl p-6 border border-gray-100">
              <h3 className="font-heading text-xl font-bold text-navy mb-3">Junior Training (U14)</h3>
              <p className="text-navy/70">Monday</p>
              <p className="text-navy/70">6:30 – 7:30pm</p>
              <p className="text-gold font-semibold mt-2">April – August</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
