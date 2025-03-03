import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const TesterPanel = () => {
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRemark, setRejectRemark] = useState("");
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});
  const [showStartDialog, setShowStartDialog] = useState(true);
  const [testerName, setTesterName] = useState("");
  const [testRunId, setTestRunId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInstructions();
    // Check if there's an existing test run
    const existingRun = localStorage.getItem("testRun");
    if (existingRun) {
      const run = JSON.parse(existingRun);
      setTestRunId(run.id);
      setTesterName(run.testerName);
      setCurrentIndex(run.currentIndex || 0);
      setShowStartDialog(false);
    }
  }, []);

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/instructions`);
      const data = await response.json();
      setLoading(false);
      setInstructions(data);
    } catch (error) {
      console.error("Error fetching instructions:", error);
    }
  };

  const startNewTestRun = (e) => {
    e.preventDefault();
    const runId = new Date().getTime().toString();
    setTestRunId(runId);
    localStorage.setItem(
      "testRun",
      JSON.stringify({
        id: runId,
        testerName,
        currentIndex: 0,
        startTime: new Date().toISOString(),
      })
    );
    setShowStartDialog(false);
    toast.success(`Started new test run for ${testerName}`);
  };

  const handleTestResponse = async (approved) => {
    if (!approved) {
      setRejectDialogOpen(true);
      return;
    }
    await submitResponse(approved);
  };

  const submitResponse = async (approved, remark = "") => {
    try {
      if (!testRunId) {
        console.error("No test run ID found");
        return;
      }

      const response = await fetch(
        `${API_URL}/instructions/${instructions[currentIndex].id}/response`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            approved,
            remark,
            testNumber: currentIndex + 1,
            testRunId,
            testerName,
          }),
        }
      );

      if (!response.ok) {
        console.error("Error submitting response:", response);
        toast.error("Failed to submit test response");
        return;
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex < instructions.length) {
        setCurrentIndex(nextIndex);
        const run = JSON.parse(localStorage.getItem("testRun"));
        localStorage.setItem(
          "testRun",
          JSON.stringify({
            ...run,
            currentIndex: nextIndex,
          })
        );
        toast.success(approved ? "Test passed! ✅" : "Test failed ❌");
      } else {
        await fetchQuestionnaires();
        setShowQuestionnaire(true);
        toast.info("All tests completed! Please fill out the questionnaire.");
      }

      setRejectDialogOpen(false);
      setRejectRemark("");
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Failed to submit test response");
    }
  };

  const handleQuestionnaireSubmit = async (e) => {
    e.preventDefault();
    try {
      const testRun = JSON.parse(localStorage.getItem("testRun"));

      const questionnaireResponse = await fetch(
        `${API_URL}/questionnaire/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            testRunId,
            testerName: testRun.testerName,
            responses: Object.entries(questionnaireAnswers).map(
              ([questionId, answer]) => ({
                questionId: parseInt(questionId),
                answer,
              })
            ),
          }),
        }
      );

      if (!questionnaireResponse.ok) {
        throw new Error("Failed to submit questionnaire");
      }

      const reportResponse = await fetch(`${API_URL}/report/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testRunId,
          testerName: testRun.testerName,
          startTime: testRun.startTime,
          endTime: new Date().toISOString(),
        }),
      });

      if (!reportResponse.ok) {
        throw new Error("Failed to generate report");
      }

      setShowQuestionnaire(false);
      localStorage.removeItem("testRun");
      setTestRunId(null);
      setCurrentIndex(0);
      setShowStartDialog(true);
      setTesterName("");
      toast.success("Test session completed! Report has been sent.");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "An error occurred");
    }
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    submitResponse(false, rejectRemark);
  };

  const fetchQuestionnaires = async () => {
    try {
      const response = await fetch(`${API_URL}/questionnaires`);
      const data = await response.json();
      setQuestionnaires(data);
      const initialAnswers = {};
      data.forEach((q) => {
        initialAnswers[q.id] = "";
      });
      setQuestionnaireAnswers(initialAnswers);
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
    }
  };

  if (loading) {
    return <div className="text-center text-white mt-8">Loading...</div>;
  }

  if (showStartDialog) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-white">
            Start New Test Run
          </h2>
          <form onSubmit={startNewTestRun} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Tester Name
              </label>
              <input
                type="text"
                value={testerName}
                onChange={(e) => setTesterName(e.target.value)}
                className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
                placeholder="Enter your name"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Start Testing
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!loading && instructions.length === 0) {
    return (
      <div className="text-center mt-8 text-white bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">
          No instructions found for this session.
        </h2>
      </div>
    );
  }

  if (showQuestionnaire) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-white">
            Final Questionnaire
          </h2>
          <form onSubmit={handleQuestionnaireSubmit} className="space-y-6">
            {questionnaires.map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="block text-lg text-white">
                  {question.title}
                  {question.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <textarea
                  value={questionnaireAnswers[question.id] || ""}
                  onChange={(e) =>
                    setQuestionnaireAnswers({
                      ...questionnaireAnswers,
                      [question.id]: e.target.value,
                    })
                  }
                  className="w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                  rows={3}
                  required={question.required}
                />
              </div>
            ))}
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Submit Questionnaire
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentInstruction = instructions[currentIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Tester Panel</h1>
        <button
          onClick={() => navigate("/")}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
      <div className="mb-4 text-center text-gray-400">
        Test {currentIndex + 1} of {instructions.length}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            {currentInstruction.title}
          </h2>
          <span
            className={`px-3 py-1 rounded ${
              currentInstruction.device === "desktop"
                ? "bg-blue-600"
                : "bg-green-600"
            } text-white text-sm`}
          >
            {currentInstruction.device === "desktop" ? "Desktop" : "Mobile"}
          </span>
        </div>

        <p className="text-gray-300 mb-6">{currentInstruction.content}</p>

        {currentInstruction.video_url && (
          <div className="mb-6">
            <h3 className="text-white text-lg mb-2">Reference Video:</h3>
            <a
              href={currentInstruction.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Watch Video Tutorial
            </a>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={() => handleTestResponse(true)}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => handleTestResponse(false)}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <Dialog.Title className="text-lg font-medium text-white mb-4">
              Rejection Reason
            </Dialog.Title>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1 px-2"
                rows={4}
                placeholder="Please explain why you are rejecting this test..."
                required
              />
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectDialogOpen(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default TesterPanel;
