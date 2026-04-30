export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-4">About Us</h1>
        <div className="prose prose-invert">
          <p className="text-slate-300 leading-relaxed">
            BluSkye Consult is a trusted HR intelligence platform dedicated to connecting professionals and employers through AI-assisted verification, human oversight, and enforceable governance.
          </p>
          <p className="text-slate-300 leading-relaxed mt-4">
            Our mission is to create a governed workforce marketplace where skills are verified, hiring is transparent, and trust is built into every interaction.
          </p>
          <h2 className="text-xl font-semibold text-white mt-6">Our Values</h2>
          <ul className="list-disc list-inside text-slate-300 space-y-2">
            <li>Trust through verification</li>
            <li>Transparency in all operations</li>
            <li>Accountability through governance</li>
            <li>Innovation with responsibility</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
