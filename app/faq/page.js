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
    <>
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
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
            backgroundSize: "200% 200%",
          }}
        />

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
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">🎯 Core Gameplay:</h3>
                  <ul className="space-y-3 text-gray-200">
                    <li><strong className="text-yellow-400">Five Clues:</strong> Each puzzle has 5 historical clues</li>
                    <li><strong className="text-yellow-400">Strategic:</strong> Each clue reduces your maximum score</li>
                    <li><strong className="text-yellow-400">Interactive Globe:</strong> Place your guess on the 3D map</li>
                    <li><strong className="text-yellow-400">Dual Scoring:</strong> Distance + year accuracy</li>
                  </ul>
                </div>

                <h3 className="text-xl font-bold text-yellow-400 mt-6 mb-3">🕹️ Game Modes:</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div 
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(139, 0, 0, 0.2)',
                      border: '1px solid rgba(139, 0, 0, 0.3)'
                    }}
                  >
                    <h4 className="font-bold text-red-400 mb-2 text-lg">📅 Daily Challenge</h4>
                    <p className="text-gray-300 text-sm">
                      5 progressive puzzles daily that get increasingly difficult!
                    </p>
                  </div>

                  <div 
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <h4 className="font-bold text-blue-400 mb-2 text-lg">♾️ Endless Mode</h4>
                    <p className="text-gray-300 text-sm">
                      Play continuously and level up your skills!
                    </p>
                  </div>

                  <div 
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <h4 className="font-bold text-purple-400 mb-2 text-lg">🤝 Challenge Friend</h4>
                    <p className="text-gray-300 text-sm">
                      Turn-based best-of-three showdown!
                    </p>
                  </div>

                  <div 
                    className="p-4 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(236, 72, 153, 0.2)',
                      border: '1px solid rgba(236, 72, 153, 0.3)'
                    }}
                  >
                    <h4 className="font-bold text-pink-400 mb-2 text-lg">⚔️ Live Battle</h4>
                    <p className="text-gray-300 text-sm">
                      Real-time multiplayer competition!
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">🪙 Rewards:</h3>
                  <p className="text-gray-200">
                    Earn <strong>coins</strong> and <strong>XP</strong> throughout all modes! Use coins for customizations, VIP packages, and special items.
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
                  <strong className="text-green-400">Yes! Completely free.</strong> All game modes and features are accessible.
                </p>
                
                <div className="pl-6 border-l-4 border-green-500/30 bg-black/20 p-4 rounded-r">
                  <h3 className="text-xl font-bold text-green-400 mb-3">✨ Free Forever:</h3>
                  <ul className="space-y-2 text-gray-200">
                    <li>• Unlimited access to all game modes</li>
                    <li>• Earn coins and XP by playing</li>
                    <li>• Global leaderboards</li>
                    <li>• Friend system and achievements</li>
                  </ul>
                </div>

                <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                  <h3 className="text-xl font-bold text-yellow-400 mb-2">🏪 Shop Coming Soon</h3>
                  <p className="text-gray-200 text-sm">
                    Spend earned coins on cosmetics and VIP packages—no real money needed!
                  </p>
                </div>
              </div>
            </div>

            {/* Question 3: Improve */}
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
                How can I improve my score?
              </h2>
              <div className="text-gray-200 space-y-4 leading-relaxed">
                <p className="text-lg">
                  Master HistoryClue through <strong>consistent practice</strong>!
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-lg" style={{ backgroundColor: 'rgba(139, 0, 0, 0.2)', border: '1px solid rgba(139, 0, 0, 0.3)' }}>
                    <h3 className="font-bold text-red-400 mb-3 text-lg">📅 Daily Practice</h3>
                    <p className="text-gray-300 text-sm">
                      Play the Daily Challenge every day to build skills progressively.
                    </p>
                  </div>

                  <div className="p-5 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <h3 className="font-bold text-blue-400 mb-3 text-lg">♾️ Endless Practice</h3>
                    <p className="text-gray-300 text-sm">
                      Experiment and learn patterns without pressure.
                    </p>
                  </div>

                  <div className="p-5 rounded-lg" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                    <h3 className="font-bold text-purple-400 mb-3 text-lg">🧠 Learn</h3>
                    <p className="text-gray-300 text-sm">
                      Review correct answers to recognize patterns.
                    </p>
                  </div>

                  <div className="p-5 rounded-lg" style={{ backgroundColor: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                    <h3 className="font-bold text-pink-400 mb-3 text-lg">⚔️ Compete</h3>
                    <p className="text-gray-300 text-sm">
                      Challenge others to improve speed and accuracy.
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-yellow-900/20 to-yellow-700/20 border border-yellow-500/30">
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">💡 Pro Tips:</h3>
                  <ul className="space-y-2 text-gray-200">
                    <li>• Use fewer clues for maximum scores</li>
                    <li>• Study world geography and timelines</li>
                    <li>• Recognize historical period indicators</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Question 4: Educational */}
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
                  HistoryClue combines <strong>history and geography</strong> in an engaging puzzle format!
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/20 to-purple-700/20 border border-purple-500/30">
                    <h4 className="font-bold text-purple-300 mb-2">📚 History</h4>
                    <p className="text-sm text-gray-300">Events, dates, movements</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900/20 to-purple-700/20 border border-purple-500/30">
                    <h4 className="font-bold text-purple-300 mb-2">🗺️ Geography</h4>
                    <p className="text-sm text-gray-300">Cities, landmarks, features</p>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-lg bg-gradient-to-r from-green-900/20 to-green-700/20 border border-green-500/30">
                  <h3 className="text-xl font-bold text-green-400 mb-3">👨‍🏫 For Schools:</h3>
                  <p className="text-gray-200 mb-3">
                    Custom educational packages with customizable puzzles and difficulty!
                  </p>
                  <p className="text-green-300 text-sm">
                    Contact:{' '}
                    <a 
                      href="mailto:GABRIEL@HISTORYCLUE.COM" 
                      className="underline font-semibold"
                    >
                      GABRIEL@HISTORYCLUE.COM
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div 
              className="p-8 rounded-xl backdrop-blur text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
              }}
            >
              <h2 
                className="text-2xl md:text-3xl font-bold mb-4"
                style={{ color: '#d4af37' }}
              >
                More Questions?
              </h2>
              <p className="text-gray-200 mb-6">
                We&apos;re here to help!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <a
                  href="mailto:GABRIEL@HISTORYCLUE.COM"
                  className="px-8 py-4 font-bold rounded-xl transition-all duration-300 inline-block"
                  style={{ 
                    background: 'linear-gradient(135deg, #d4af37 0%, #f4cf67 100%)',
                    color: '#000',
                    boxShadow: '0 10px 30px rgba(212, 175, 55, 0.4)'
                  }}
                >
                  📧 Contact Us
                </a>
                
                <a
                  href="https://historyclue.com"
                  className="px-8 py-4 font-bold text-white rounded-xl transition-all duration-300 inline-block border-2"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.5) 0%, rgba(165, 42, 42, 0.5) 100%)',
                    borderColor: 'rgba(139, 0, 0, 0.6)',
                    boxShadow: '0 10px 30px rgba(139, 0, 0, 0.3)'
                  }}
                >
                  🏠 Back to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
