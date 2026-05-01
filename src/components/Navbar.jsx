// Add state for tester visibility
const [testerVisibility, setTesterVisibility] = useState({
    show_login_button: false,
    show_register_button: false
});

// Load tester visibility settings
useEffect(() => {
    async function loadTesterVisibility() {
        const { data } = await supabase
            .from('system_config')
            .select('config_value')
            .eq('config_key', 'tester_visibility')
            .single();
        
        if (data?.config_value) {
            setTesterVisibility(data.config_value);
        }
    }
    loadTesterVisibility();
}, []);

// In the navbar JSX, conditionally render tester buttons:
{testerVisibility.show_login_button && !user && (
    <Link to="/tester-login" className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
        Tester Login
    </Link>
)}
{testerVisibility.show_register_button && !user && (
    <Link to="/tester-register" className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
        Become a Tester
    </Link>
)}
