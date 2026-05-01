// Add imports
import TrendingTopics from '../components/TrendingTopics';
import UserPreferences from '../components/UserPreferences';

// Inside the return, add a sidebar next to the articles grid
<div className="flex flex-col lg:flex-row gap-8">
    <div className="flex-1">
        {/* Articles grid content */}
    </div>
    <div className="lg:w-80">
        <div className="sticky top-24 space-y-6">
            <UserPreferences />
            <TrendingTopics />
        </div>
    </div>
</div>
