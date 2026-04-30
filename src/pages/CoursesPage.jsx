export default function CoursesPage() {
  const courses = [
    { id: 1, title: 'HR Compliance Masterclass', level: 'Intermediate', duration: '4 weeks' },
    { id: 2, title: 'AI in Recruitment', level: 'Advanced', duration: '3 weeks' },
    { id: 3, title: 'Employment Law Essentials', level: 'Beginner', duration: '2 weeks' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Courses</h1>
        <p className="text-slate-400 mb-8">Accelerate your growth with expert-led courses</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courses.map(course => (
            <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
              <h2 className="text-xl font-semibold text-white">{course.title}</h2>
              <div className="mt-4 flex gap-2">
                <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">{course.level}</span>
                <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">{course.duration}</span>
              </div>
              <button className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">Enroll Now</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
