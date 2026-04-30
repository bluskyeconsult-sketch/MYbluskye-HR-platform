export default function BooksPage() {
  const books = [
    { id: 1, title: 'The HR Playbook', author: 'Sarah Johnson', price: '$29.99' },
    { id: 2, title: 'AI Ethics in Employment', author: 'David Chen', price: '$34.99' },
    { id: 3, title: 'Global Recruitment Strategies', author: 'Maria Garcia', price: '$39.99' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Books</h1>
        <p className="text-slate-400 mb-8">Essential reads for HR professionals</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {books.map(book => (
            <div key={book.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all">
              <h2 className="text-xl font-semibold text-white">{book.title}</h2>
              <p className="text-slate-400 mt-1">by {book.author}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-emerald-400 font-semibold">{book.price}</span>
                <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Purchase</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
