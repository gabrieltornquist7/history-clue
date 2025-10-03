// components/FAQContent.js
"use client";
export default function FAQContent({ handleSetView }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 
          className="text-5xl md:text-6xl font-serif font-bold mb-4"
          style={{ 
            color: '#d4af37',
            textShadow: '0 0 30px rgba(212, 175, 55, 0.4)'
          }}
        >
          Frequently Asked Questions
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Everything you need to know about playing HistoryClue
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4 mb-12">
        {[
          { q: "How does HistoryClue work?", icon: "🎮", id: "how-it-works" },
          { q: "Is it free to play?", icon: "💰", id: "pricing" },
          { q: "How can I improve?", icon: "📈", id: "improve" },
          { q: "Educational benefits?", icon: "🎓", id: "educational" }
        ].map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="p-4 rounded-lg transition-all duration-300 border"
            style={{
              background: 'rgba(212, 175, 55, 0.05)',
              borderColor: 'rgba(212, 175, 55, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(212, 175, 55, 0.1)';
              e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(212, 175, 55, 0.05)';
              e.target.style.borderColor = 'rgba(212, 175, 55, 0.2)';
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white font-medium">{item.q}</span>
            </div>
          </a>
        ))}
      </div>

      {/* FAQ Content */}
      <div className="space-y-8">
        {/* Question 1 */}
        <div 
          id="how-it-works"
          className="p-8 rounded-xl backdrop-blur scroll-mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.02) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <h2 
            className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-3"
            style={{ color: '#d4af37' }}
          >
            <span className="text-3xl">🎮</span>
            How does HistoryClue work?
          </h2>
          <div className="text-gray-200 space-y-4 leading-relaxed">
            <p className="text-lg">
              <strong>HistoryClue</strong> is an innovative history and geography game where you become a historical detective! 
              Your mission is to deduce <em>when and where</em> you are in history based on five carefully crafted clues.
            </p>
            
            <div className="pl-6 border-l-4 border-yellow-500/30 bg-black/20 p-4 rounded-r space-y-2">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">🎯 How to Play:</h3>
              <p className="text-gray-200">• Receive <strong>5 historical clues</strong> about a location and time period</p>
              <p className="text-gray-200">• Each clue you reveal <strong>reduces your maximum score</strong></p>
              <p className="text-gray-200">• <strong>Place a pin</strong> on the interactive 3D globe</p>
              <p className="text-gray-200">• Score based on <strong>distance AND year accuracy</strong></p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(139, 0, 0, 0.2)', border: '1px solid rgba(139, 0, 0, 0.3)' }}>
                <h4 className="font-bold text-red-400 mb-2">📅 Daily Challenge</h4>
                <p className="text-gray-300 text-sm">5 progressive puzzles daily. Completing all 5 is the ultimate test!</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h4 className="font-bold text-blue-400 mb-2">♾️ Endless Mode</h4>
                <p className="text-gray-300 text-sm">Play continuously, level up, and master historical periods.</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <h4 className="font-bold text-purple-400 mb-2">🤝 Challenge Friend</h4>
                <p className="text-gray-300 text-sm">Turn-based best-of-three competition!</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                <h4 className="font-bold text-pink-400 mb-2">⚔️ Live Battle</h4>
                <p className="text-gray-300 text-sm">Real-time multiplayer with 90-second rounds!</p>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">🪙 Earn Rewards:</h3>
              <p className="text-gray-200">
                Collect <strong>coins</strong> and <strong>XP</strong> by playing! Use coins to purchase customizable items, 
                VIP packages for bonus XP, special titles, and more—all with in-game currency earned through gameplay!
              </p>
            </div>
          </div>
        </div>

        {/* Question 2 */}
        <div 
          id="pricing"
          className="p-8 rounded-xl backdrop-blur scroll-mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <h2 
            className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-3"
            style={{ color: '#22c55e' }}
          >
            <span className="text-3xl">💰</span>
            Is HistoryClue free to play?
          </h2>
          <div className="text-gray-200 space-y-4 leading-relaxed">
            <p className="text-lg">
              <strong className="text-green-400">Yes! HistoryClue is completely free.</strong> All game modes, features, and rewards are accessible without payment.
            </p>
            
            <div className="pl-6 border-l-4 border-green-500/30 bg-black/20 p-4 rounded-r space-y-2">
              <h3 className="text-xl font-bold text-green-400 mb-3">✨ What's Free:</h3>
              <p className="text-gray-200">• All game modes (Daily, Endless, Challenge Friend, Live Battle)</p>
              <p className="text-gray-200">• Earn coins & XP through gameplay</p>
              <p className="text-gray-200">• Global leaderboards & rankings</p>
              <p className="text-gray-200">• Social features & friend system</p>
              <p className="text-gray-200">• Achievements & badges</p>
            </div>

            <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
              <h3 className="text-xl font-bold text-yellow-400 mb-2">🏪 Shop Coming Soon!</h3>
              <p className="text-gray-200 text-sm">
                Purchase customizations and VIP packages using <strong>coins earned by playing</strong>—no real money required!
              </p>
            </div>
          </div>
        </div>

        {/* Question 3 */}
        <div 
          id="improve"
          className="p-8 rounded-xl backdrop-blur scroll-mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <h2 
            className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-3"
            style={{ color: '#3b82f6' }}
          >
            <span className="text-3xl">📈</span>
            How can I improve my score?
          </h2>
          <div className="text-gray-200 space-y-4 leading-relaxed">
            <p className="text-lg">
              The best way to improve is through <strong>consistent practice</strong>! Here's how:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(139, 0, 0, 0.2)', border: '1px solid rgba(139, 0, 0, 0.3)' }}>
                <h3 className="font-bold text-red-400 mb-2 text-lg">📅 Play Daily</h3>
                <p className="text-gray-300 text-sm">Complete the Daily Challenge every day to build skills progressively.</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h3 className="font-bold text-blue-400 mb-2 text-lg">♾️ Practice in Endless</h3>
                <p className="text-gray-300 text-sm">No pressure—learn patterns and improve your deduction skills.</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <h3 className="font-bold text-purple-400 mb-2 text-lg">🧠 Learn from Mistakes</h3>
                <p className="text-gray-300 text-sm">Review correct answers after each puzzle to recognize patterns.</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                <h3 className="font-bold text-pink-400 mb-2 text-lg">⚔️ Compete</h3>
                <p className="text-gray-300 text-sm">Challenge friends and join Live Battles to improve speed and accuracy.</p>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
              <h3 className="text-xl font-bold text-yellow-400 mb-3">💡 Pro Tips:</h3>
              <p className="text-gray-200 text-sm">• Use fewer clues for higher scores</p>
              <p className="text-gray-200 text-sm">• Study world geography and historical timelines</p>
              <p className="text-gray-200 text-sm">• Recognize time period indicators in clues</p>
              <p className="text-gray-200 text-sm">• Track your stats to identify weak areas</p>
            </div>
          </div>
        </div>

        {/* Question 4 */}
        <div 
          id="educational"
          className="p-8 rounded-xl backdrop-blur scroll-mt-8"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(168, 85, 247, 0.02) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <h2 
            className="text-2xl md:text-3xl font-bold mb-4 flex items-center gap-3"
            style={{ color: '#a855f7' }}
          >
            <span className="text-3xl">🎓</span>
            What makes HistoryClue educational?
          </h2>
          <div className="text-gray-200 space-y-4 leading-relaxed">
            <p className="text-lg">
              HistoryClue combines <strong>history and geography</strong> in an engaging puzzle format, making learning fun and interactive!
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/20 to-purple-700/20 border border-purple-500/30">
                <h4 className="font-bold text-purple-300 mb-2">📚 History</h4>
                <p className="text-sm text-gray-300">• Major events & dates</p>
                <p className="text-sm text-gray-300">• Cultural movements</p>
                <p className="text-sm text-gray-300">• Political developments</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/20 to-purple-700/20 border border-purple-500/30">
                <h4 className="font-bold text-purple-300 mb-2">🗺️ Geography</h4>
                <p className="text-sm text-gray-300">• World cities & capitals</p>
                <p className="text-sm text-gray-300">• Landmarks & features</p>
                <p className="text-sm text-gray-300">• Cultural geography</p>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-green-900/20 to-green-700/20 border border-green-500/30">
              <h3 className="text-xl font-bold text-green-400 mb-3">👨‍🏫 For Schools:</h3>
              <p className="text-gray-200 mb-3">
                We're developing <strong>custom educational packages</strong> for classrooms!
              </p>
              <p className="text-gray-200 text-sm">
                Teachers can customize puzzles, difficulty, historical periods, and track student progress.
              </p>
              <p className="text-green-300 mt-3 text-sm">
                Contact us at{' '}
                <a 
                  href="mailto:GABRIEL@HISTORYCLUE.COM" 
                  className="underline font-semibold hover:text-green-200"
                >
                  GABRIEL@HISTORYCLUE.COM
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div 
          className="p-8 rounded-xl backdrop-blur"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <h2 
            className="text-2xl md:text-3xl font-bold mb-4 text-center"
            style={{ color: '#d4af37' }}
          >
            Still have questions?
          </h2>
          <p className="text-gray-200 text-center mb-6">
            We're here to help! Contact us anytime.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <a
              href="mailto:GABRIEL@HISTORYCLUE.COM"
              className="px-8 py-4 font-bold rounded-xl transition-all duration-300 text-center"
              style={{ 
                background: 'linear-gradient(135deg, #d4af37 0%, #f4cf67 100%)',
                color: '#000',
                boxShadow: '0 10px 30px rgba(212, 175, 55, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(212, 175, 55, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(212, 175, 55, 0.4)';
              }}
            >
              📧 Contact Us
            </a>
            
            <button
              onClick={() => handleSetView("menu")}
              className="px-8 py-4 font-bold text-white rounded-xl transition-all duration-300 text-center border-2"
              style={{ 
                background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.5) 0%, rgba(165, 42, 42, 0.5) 100%)',
                borderColor: 'rgba(139, 0, 0, 0.6)',
                boxShadow: '0 10px 30px rgba(139, 0, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(139, 0, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
              }}
            >
              🏠 Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
