
import React from 'react';

const CloudMusic: React.FC = () => {
    return (
        <div className="p-8 text-white">
            <h1 className="text-3xl font-bold mb-6">Cloud Music</h1>
            <div className="bg-white/5 rounded-xl p-8 text-center text-white/50">
                <p>Connect your Netease Cloud or Spotify account to stream music directly.</p>
                <div className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg inline-block">
                    Coming Soon
                </div>
            </div>
        </div>
    );
};

export default CloudMusic;
