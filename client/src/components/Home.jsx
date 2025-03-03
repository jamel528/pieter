import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-8">
          Test Instruction Management System
        </h1>
        <div className="space-x-4">
          <button
            onClick={() => navigate("/admin")}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Admin
          </button>
          <button
            onClick={() => navigate("/tester")}
            className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Tester
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
