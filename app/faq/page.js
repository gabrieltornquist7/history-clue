// app/faq/page.js
import { Metadata } from 'next';

export const metadata = {
  title: 'FAQ - How to Play HistoryClue | History & Geography Game Guide',
  description: 'Learn how to play HistoryClue, our interactive history and geography trivia game. Get answers about scoring, game modes, educational benefits, and how to master historical puzzles.',
  keywords: [
    'HistoryClue FAQ',
    'how to play HistoryClue',
    'history game guide',
    'geography quiz help',
    'trivia game tutorial',
    'educational game faq',
    'history puzzle guide',
    'game scoring system',
    'daily challenge guide',
    'multiplayer history game'
  ],
  openGraph: {
    title: 'FAQ - How to Play HistoryClue',
    description: 'Get answers to common questions about HistoryClue, the interactive history and geography trivia game.',
    type: 'website',
  },
};

export default function FAQPage() {
  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: `
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
          radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
        `
      }}
    >
      {/* Schema.org JSON-LD for FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "How does HistoryClue work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "HistoryClue is an interactive history and geography game where you deduce when and where you are in history based on five clues. Each clue you unlock reduces your potential score, challenging you to make accurate guesses with minimal information. You place a pin on a 3D globe, and your score is calculated based on how close you are in both distance and year accuracy. The game features multiple modes including Daily Challenge, Endless Mode, Challenge Friend, and Live Battle."
                }
              },
              {
                "@type": "Question",
                "name": "Is HistoryClue free to play?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, HistoryClue is completely free to play! You can enjoy all game modes and earn coins and XP through gameplay. We're developing an in-game shop where you'll be able to purchase customizable items and VIP packages using coins earned by playing."
                }
              },
              {
                "@type": "Question",
                "name": "How can I improve my score in HistoryClue?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The best way to improve your HistoryClue score is to play regularly! Each game helps you learn historical patterns, geographic relationships, and clue interpretation skills. Start with the Daily Challenge to build your knowledge progressively, and practice in Endless Mode to hone your deduction skills."
                }
              },
              {
                "@type": "Question",
                "name": "What makes HistoryClue educational?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "HistoryClue combines history and geography in an engaging puzzle format, making learning about historical events and world locations fun and interactive. Players naturally absorb historical knowledge and geographical relationships while playing. We're developing special educational packages for schools where teachers can customize puzzle types and clue difficulty to match their curriculum."
                }
              }
            ]
          })
        }}
      />

      {/* Metallic shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      ></div>
      
      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

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
            Everything you need to know about playing HistoryClue, the ultimate history and geography trivia game
          </p>
        </div>

        {/* FAQ Content */}
        <div className="space-y-8">
          {/* Question 1: How does HistoryClue work? */}
          <div 
            className="p-8 rounded-xl backdrop-blur"
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
                <strong>HistoryClue</strong> is an innovative <strong>history and geography game</strong> where you become a historical detective! 
                Your mission is to deduce <em>when and where</em> you are in history based on five carefully crafted clues.
              </p>
              
              <div className="pl-6 border-l-4 border-yellow-500/30 bg-black/20 p-4 rounded-r">
                <h3 className="text-xl font-bold text-yellow-400 mb-3">🎯 Core Gameplay Mechanics:</h3>
                <ul className="space-y-3 text-gray-200">
                  <li><strong className="text-yellow-400">Five Historical Clues:</strong> Each puzzle presents five clues about a specific location and time period in history</li>
                  <li><strong className="text-yellow-400">Strategic Deduction:</strong> Each clue you reveal reduces your maximum possible score, rewarding quick thinking and historical knowledge</li>
                  <li><strong className="text-yellow-400">Interactive Globe:</strong> Place your guess pin anywhere on our 3D world map</li>
                  <li><strong className="text-yellow-400">Dual Scoring System:</strong> Your score is calculated based on both distance accuracy (how close you are to the actual location) and year accuracy (how close to the actual historical date)</li>
                </ul>
              </div>

              <h3 className="text-xl font-bold text-yellow-400 mt-6 mb-3">🕹️ Multiple Game Modes:</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div 
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(139, 0, 0, 0.2)',
                    border: '1px solid rgba(139, 0, 0, 0.3)'
                  }}
                >
                  <h4 className="font-bold text-red-400 mb-2 text-lg flex items-center gap-2">
                    <span>📅</span> Daily Challenge
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Five progressive puzzles every day that get increasingly difficult. 
                    Completing all five puzzles is a true test of your historical knowledge! 
                    Perfect for building consistent learning habits and competing on daily leaderboards.
                  </p>
                </div>

                <div 
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <h4 className="font-bold text-blue-400 mb-2 text-lg flex items-center gap-2">
                    <span>♾️</span> Endless Mode
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Keep playing as long as you want! Level up continuously as you master historical periods and geographical regions. 
                    Great for practice and improving your overall skills.
                  </p>
                </div>

                <div 
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.3)'
                  }}
                >
                  <h4 className="font-bold text-purple-400 mb-2 text-lg flex items-center gap-2">
                    <span>🤝</span> Challenge Friend
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Turn-based competition! Challenge your friends to a best-of-three puzzle showdown. 
                    Take turns solving puzzles and see who has the superior historical knowledge.
                  </p>
                </div>

                <div 
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    border: '1px solid rgba(236, 72, 153, 0.3)'
                  }}
                >
                  <h4 className="font-bold text-pink-400 mb-2 text-lg flex items-center gap-2">
                    <span>⚔️</span> Live Battle
                  </h4>
                  <p className="text-gray-300 text-sm">
                    Real-time multiplayer action! Compete against other players in simultaneous best-of-three battles. 
                    Experience the thrill of racing against the clock and your opponent.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-3">🪙 Rewards & Progression:</h3>
                <p className="text-gray-200">
                  Earn <strong>coins</strong> and <strong>XP</strong> throughout all game modes! Use your earned coins to purchase:
                </p>
                <ul className="mt-3 space-y-2 text-gray-200 ml-6">
                  <li>• <strong>Customizable items</strong> including titles, frames, and badges</li>
                  <li>• <strong>VIP packages</strong> for enhanced XP gains</li>
                  <li>• <strong>Special cosmetics</strong> to personalize your profile</li>
                </ul>
                <p className="text-sm text-yellow-300 mt-3 italic">
                  All items can be purchased with in-game currency earned by playing—no real money required!
                </p>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-blue-900/20 to-blue-700/20 border border-blue-500/30">
                <h3 className="text-xl font-bold text-blue-400 mb-3">👥 Social Features:</h3>
                <p className="text-gray-200">
                  Connect with fellow history enthusiasts! Add friends, compare scores on leaderboards, 
                  send challenges, and track your ranking globally. Build your history community!
                </p>
              </div>
            </div>
          </div>

          {/* Question 2: Is it free? */}
          <div 
            className="p-8 rounded-xl backdrop-blur"
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
                <strong className="text-green-400">Yes! HistoryClue is completely free to play.</strong> We believe everyone should have access to educational gaming experiences.
              </p>
              
              <div className="pl-6 border-l-4 border-green-500/30 bg-black/20 p-4 rounded-r">
                <h3 className="text-xl font-bold text-green-400 mb-3">✨ What's Included for Free:</h3>
                <ul className="space-y-2 text-gray-200">
                  <li>• Unlimited access to all game modes (Daily Challenge, Endless, Challenge Friend, Live Battle)</li>
                  <li>• Earn coins and XP by playing</li>
                  <li>• Global leaderboards and rankings</li>
                  <li>• Friend system and social features</li>
                  <li>• Achievement system and badges</li>
                  <li>• Regular new historical puzzles</li>
                </ul>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-3">🏪 Coming Soon: In-Game Shop</h3>
                <p className="text-gray-200">
                  We're developing an <strong>in-game shop</strong> where you can spend coins you've earned through gameplay. 
                  All shop items can be purchased using <strong>in-game currency only</strong>—earned by playing, not purchased with real money.
                </p>
                <p className="text-sm text-gray-400 mt-3 italic">
                  Shop features will include cosmetic items, profile customizations, VIP packages for bonus XP, and special titles.
                </p>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-purple-900/20 to-purple-700/20 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-400 mb-3">🎓 Educational Institutions:</h3>
                <p className="text-gray-200">
                  Schools and educational organizations interested in custom packages should contact us at{' '}
                  <a 
                    href="mailto:GABRIEL@HISTORYCLUE.COM" 
                    className="text-purple-300 hover:text-purple-200 underline font-semibold"
                  >
                    GABRIEL@HISTORYCLUE.COM
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Question 3: How to improve */}
          <div 
            className="p-8 rounded-xl backdrop-blur"
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
              How can I improve my score in HistoryClue?
            </h2>
            <div className="text-gray-200 space-y-4 leading-relaxed">
              <p className="text-lg">
                The best way to improve your <strong>historical knowledge</strong> and <strong>geography skills</strong> is through <strong>consistent practice</strong>! 
                Here are proven strategies to boost your HistoryClue performance:
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div 
                  className="p-5 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(139, 0, 0, 0.2)',
                    border: '1px solid rgba(139, 0, 0, 0.3)'
                  }}
                >
                  <h3 className="font-bold text-red-400 mb-3 text-lg">📅 Daily Practice</h3>
                  <p className="text-gray-300 text-sm">
                    <strong>Play the Daily Challenge every day.</strong> The progressive difficulty helps you build skills incrementally. 
                    Even if you can't complete all 5 puzzles initially, you'll improve over time as you recognize historical patterns.
                  </p>
                </div>

                <div 
                  className="p-5 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <h3 className="font-bold text-blue-400 mb-3 text-lg">♾️ Practice in Endless Mode</h3>
                  <p className="text-gray-300 text-sm">
                    <strong>Use Endless Mode to experiment and learn.</strong> With no pressure, you can take your time understanding 
                    how clues relate to specific time periods and locations. Focus on recognizing geographical features and historical contexts.
                  </p>
                </div>

                <div 
                  className="p-5 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    border: '1px solid rgba(168, 85, 247, 0.3)'
                  }}
                >
                  <h3 className="font-bold text-purple-400 mb-3 text-lg">🧠 Learn from Mistakes</h3>
                  <p className="text-gray-300 text-sm">
                    <strong>After each puzzle, review the correct answer.</strong> Understanding why the answer is what it is helps you 
                    recognize similar clue patterns in future puzzles. Every wrong guess is a learning opportunity!
                  </p>
                </div>

                <div 
                  className="p-5 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    border: '1px solid rgba(236, 72, 153, 0.3)'
                  }}
                >
                  <h3 className="font-bold text-pink-400 mb-3 text-lg">⚔️ Competitive Play</h3>
                  <p className="text-gray-300 text-sm">
                    <strong>Challenge friends and join Live Battles.</strong> Competition naturally improves your speed and accuracy. 
                    Playing against others helps you learn new strategies and approaches to historical deduction.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-3">💡 Pro Tips for Higher Scores:</h3>
                <ul className="space-y-2 text-gray-200">
                  <li>• <strong>Use fewer clues:</strong> Try to guess with only 1-2 clues to maximize your score potential</li>
                  <li>• <strong>Study world geography:</strong> Knowing major cities, landmarks, and regional features helps tremendously</li>
                  <li>• <strong>Learn historical timelines:</strong> Understanding when major events occurred narrows down the year range</li>
                  <li>• <strong>Recognize clue patterns:</strong> Certain words and phrases are associated with specific time periods</li>
                  <li>• <strong>Track your progress:</strong> Review your statistics to identify which time periods or regions you need to study</li>
                </ul>
              </div>

              <p className="text-gray-300 mt-6 text-center italic">
                Remember: Every game makes you better! The more you play, the more historical knowledge you'll naturally absorb. 🚀
              </p>
            </div>
          </div>

          {/* Question 4: Educational benefits */}
          <div 
            className="p-8 rounded-xl backdrop-blur"
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
                HistoryClue is more than just a game—it's an <strong>interactive learning platform</strong> that makes mastering 
                history and geography engaging and fun! Here's why educators and students love it:
              </p>

              <div className="mt-6 p-6 rounded-lg bg-gradient-to-r from-purple-900/20 to-purple-700/20 border border-purple-500/30">
                <h3 className="text-xl font-bold text-purple-400 mb-4">🌍 Dual-Subject Learning:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-purple-300 mb-2">📚 History</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                      <li>• Major historical events and dates</li>
                      <li>• Cultural movements and periods</li>
                      <li>• Political developments across eras</li>
                      <li>• Technological advancements timeline</li>
                      <li>• Social and economic history</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-300 mb-2">🗺️ Geography</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                      <li>• World cities and capitals</li>
                      <li>• Geographical features and landmarks</li>
                      <li>• Regional characteristics</li>
                      <li>• Cultural geography connections</li>
                      <li>• Spatial reasoning skills</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-blue-900/20 to-blue-700/20 border border-blue-500/30">
                <h3 className="text-xl font-bold text-blue-400 mb-3">🧩 Engaging Puzzle Format:</h3>
                <p className="text-gray-200">
                  Unlike traditional memorization, HistoryClue uses <strong>contextual clues</strong> and <strong>critical thinking</strong> to teach. 
                  Players naturally absorb historical knowledge while solving puzzles, making learning feel like play rather than study. 
                  This approach leads to better retention and genuine understanding of historical contexts.
                </p>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-green-900/20 to-green-700/20 border border-green-500/30">
                <h3 className="text-xl font-bold text-green-400 mb-3">👨‍🏫 For Educators & Schools:</h3>
                <p className="text-gray-200 mb-4">
                  We're developing <strong>special educational packages</strong> designed specifically for classroom use! 
                  Teachers will be able to:
                </p>
                <ul className="space-y-2 text-gray-200 ml-6">
                  <li>• <strong>Customize puzzle content</strong> to match their curriculum and learning objectives</li>
                  <li>• <strong>Choose difficulty levels</strong> appropriate for different grade levels</li>
                  <li>• <strong>Select specific historical periods</strong> they're teaching (Ancient Rome, World War II, Renaissance, etc.)</li>
                  <li>• <strong>Control clue complexity</strong> and writing style to match student reading levels</li>
                  <li>• <strong>Track student progress</strong> and identify areas needing reinforcement</li>
                  <li>• <strong>Create custom assignments</strong> focused on specific topics</li>
                </ul>
                <p className="text-gray-300 mt-4 text-sm">
                  Interested schools and educators can contact us at{' '}
                  <a 
                    href="mailto:GABRIEL@HISTORYCLUE.COM" 
                    className="text-green-300 hover:text-green-200 underline font-semibold"
                  >
                    GABRIEL@HISTORYCLUE.COM
                  </a>
                  {' '}to discuss custom educational packages and bulk licensing.
                </p>
              </div>

              <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                <h3 className="text-xl font-bold text-yellow-400 mb-3">🎯 Learning Outcomes:</h3>
                <p className="text-gray-200 mb-3">Students who regularly play HistoryClue develop:</p>
                <ul className="space-y-2 text-gray-200">
                  <li>• <strong>Historical Literacy:</strong> Understanding of major events, periods, and their relationships</li>
                  <li>• <strong>Geographical Awareness:</strong> Mental maps of world locations and their significance</li>
                  <li>• <strong>Critical Thinking:</strong> Deductive reasoning and evidence-based conclusions</li>
                  <li>• <strong>Cultural Knowledge:</strong> Appreciation for diverse historical perspectives and contexts</li>
                  <li>• <strong>Timeline Understanding:</strong> Chronological thinking and cause-effect relationships</li>
                </ul>
              </div>

              <p className="text-gray-300 mt-6 text-center text-lg italic">
                "Learning history has never been this engaging!" - Make education fun with HistoryClue 🌟
              </p>
            </div>
          </div>

          {/* Additional Questions */}
          <div 
            className="p-8 rounded-xl backdrop-blur"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 
              className="text-2xl md:text-3xl font-bold mb-6"
              style={{ color: '#d4af37' }}
            >
              More Questions?
            </h2>
            <p className="text-gray-200 text-lg leading-relaxed mb-6">
              We're here to help! If you have additional questions about HistoryClue, scoring mechanics, 
              game modes, or anything else, don't hesitate to reach out.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <a
                href="mailto:GABRIEL@HISTORYCLUE.COM"
                className="px-8 py-4 font-bold text-white rounded-xl transition-all duration-300 text-center"
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
              
              <a
                href="/"
                className="px-8 py-4 font-bold text-white rounded-xl transition-all duration-300 text-center border-2"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.5) 0%, rgba(165, 42, 42, 0.5) 100%)',
                  borderColor: 'rgba(139, 0, 0, 0.6)',
                  boxShadow: '0 10px 30px rgba(139, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 15px 40px rgba(139, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
                }}
              >
                🏠 Back to Home
              </a>
            </div>
          </div>
        </div>

        {/* SEO Keywords Footer (hidden but helps with indexing) */}
        <div className="sr-only">
          history game, geography quiz, educational trivia, world history, geography learning, 
          interactive history game, historical knowledge test, geography trivia game, 
          daily history challenge, multiplayer history game, free educational game, 
          learn history online, history puzzle game, geography education, historical events game
        </div>
      </div>
    </div>
  );
}
