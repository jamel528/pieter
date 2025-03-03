import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { Tab } from "@headlessui/react";
import CredentialManager from "./CredentialManager";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState([]);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [newInstruction, setNewInstruction] = useState({
    title: "",
    content: "",
    device: "desktop",
    video_url: "",
  });
  const [newQuestion, setNewQuestion] = useState({ title: "", required: true });
  const [editingId, setEditingId] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchInstructions();
    fetchQuestionnaires();
  }, []);

  const fetchInstructions = async () => {
    try {
      const response = await fetch(`${API_URL}/instructions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setInstructions(data);
    } catch (error) {
      console.error("Error fetching instructions:", error);
      toast.error("Failed to fetch instructions");
    }
  };

  const fetchQuestionnaires = async () => {
    try {
      const response = await fetch(`${API_URL}/questionnaires`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setQuestionnaires(data);
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
      toast.error("Failed to fetch questionnaires");
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setInstructions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        updateInstructionOrder(newOrder);
        return newOrder;
      });
    }
  };

  const updateInstructionOrder = async (newOrder) => {
    try {
      await fetch(`${API_URL}/instructions/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ instructions: newOrder }),
      });
      toast.success("Instruction order updated successfully!");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update instruction order");
    }
  };

  const handleSubmitInstruction = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fetch(`${API_URL}/instructions/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            title: newInstruction.title,
            content: newInstruction.content,
            device: newInstruction.device,
            video_url: newInstruction.video_url || null,
          }),
        });
        toast.success("Instruction updated successfully!");
      } else {
        const response = await fetch(`${API_URL}/instructions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            title: newInstruction.title,
            content: newInstruction.content,
            device: newInstruction.device,
            video_url: newInstruction.video_url || null,
          }),
        });

        if (!response.ok) throw new Error("Failed to add instruction");

        const data = await response.json();
        setInstructions([...instructions, { ...data, id: data.id }]);
        toast.success("Instruction added successfully!");
      }
      setNewInstruction({
        title: "",
        content: "",
        device: "desktop",
        video_url: "",
      });
      setEditingId(null);
      fetchInstructions();
    } catch (error) {
      console.error("Error saving instruction:", error);
      toast.error("Failed to save instruction");
    }
  };

  const handleSubmitQuestionnaire = async (e) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        const updatedQuestions = questionnaires.map((q) =>
          q.id === editingQuestion ? { ...q, ...newQuestion } : q
        );
        await updateQuestionnaire(updatedQuestions);
        toast.success("Question updated successfully!");
      } else {
        const updatedQuestions = [
          ...questionnaires,
          { ...newQuestion, id: Date.now() },
        ];
        await updateQuestionnaire(updatedQuestions);
        toast.success("Question added successfully!");
      }
      setNewQuestion({ title: "", required: true });
      setEditingQuestion(null);
      fetchQuestionnaires();
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      toast.error("Failed to save questionnaire");
    }
  };

  const updateQuestionnaire = async (questions) => {
    try {
      await fetch(`${API_URL}/questionnaire`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ questions }),
      });
    } catch (error) {
      console.error("Error updating questionnaire:", error);
      toast.error("Failed to update questionnaire");
    }
  };

  const handleDeleteClick = (instruction) => {
    setSelectedInstruction(instruction);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedInstruction) return;

    try {
      const response = await fetch(`${API_URL}/instructions/${selectedInstruction.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        setInstructions(instructions.filter((i) => i.id !== selectedInstruction.id));
        toast.success("Instruction deleted successfully");
      } else {
        toast.error("Failed to delete instruction");
      }
    } catch (error) {
      console.error("Error deleting instruction:", error);
      toast.error("Failed to delete instruction");
    } finally {
      setShowDeleteDialog(false);
      setSelectedInstruction(null);
    }
  };

  const handleEditInstruction = (instruction) => {
    setNewInstruction({
      title: instruction.title,
      content: instruction.content,
      device: instruction.device,
      video_url: instruction.video_url,
    });
    setEditingId(instruction.id);
  };

  const handleEditQuestion = (question) => {
    setNewQuestion({ title: question.title, required: question.required });
    setEditingQuestion(question.id);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <div className="space-x-4">
          <button
            onClick={() => setIsCredentialModalOpen(true)}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500"
          >
            Change Credentials
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-gray-700 p-1 mb-8">
          <Tab
            className={({ selected }) =>
              classNames(
                "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-gray-400 focus:outline-none focus:ring-2",
                selected
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-100 hover:bg-indigo-500 hover:text-white"
              )
            }
          >
            Test Instructions
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-gray-400 focus:outline-none focus:ring-2",
                selected
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-100 hover:bg-indigo-500 hover:text-white"
              )
            }
          >
            Final Questionnaire
          </Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>
            {/* Test Instructions Panel */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                {editingId
                  ? "Edit Test Instruction"
                  : "Add New Test Instruction"}
              </h2>
              <form onSubmit={handleSubmitInstruction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newInstruction.title}
                    onChange={(e) =>
                      setNewInstruction({
                        ...newInstruction,
                        title: e.target.value,
                      })
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Content
                  </label>
                  <textarea
                    value={newInstruction.content}
                    onChange={(e) =>
                      setNewInstruction({
                        ...newInstruction,
                        content: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Device
                  </label>
                  <select
                    value={newInstruction.device}
                    onChange={(e) =>
                      setNewInstruction({
                        ...newInstruction,
                        device: e.target.value,
                      })
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newInstruction.video_url}
                    onChange={(e) =>
                      setNewInstruction({
                        ...newInstruction,
                        video_url: e.target.value,
                      })
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="https://example.com/video"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                  >
                    {editingId ? "Update Instruction" : "Add Instruction"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewInstruction({
                          title: "",
                          content: "",
                          device: "desktop",
                          video_url: "",
                        });
                        setEditingId(null);
                      }}
                      className="ml-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">
                Test Instructions
              </h2>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={instructions}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {instructions.map((instruction) => (
                      <SortableItem key={instruction.id} id={instruction.id}>
                        <div className="pr-10">
                          <h3 className="text-lg font-semibold text-white">
                            {instruction.title}
                          </h3>
                          <p className="text-gray-300">
                            {instruction.content}
                          </p>
                          <p className="text-gray-300">
                            Device: {instruction.device}
                          </p>
                          {instruction.video_url && (
                            <p className="text-gray-300">
                              Video URL: {instruction.video_url}
                            </p>
                          )}
                          <div className="mt-2 space-x-4">
                            <button
                              onClick={() => handleEditInstruction(instruction)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(instruction)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </Tab.Panel>

          <Tab.Panel>
            {/* Questionnaire Panel */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                {editingQuestion ? "Edit Question" : "Add New Question"}
              </h2>
              <form onSubmit={handleSubmitQuestionnaire} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={newQuestion.title}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, title: e.target.value })
                    }
                    placeholder="Question"
                    className="w-full p-2 rounded bg-gray-700 text-white"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newQuestion.required}
                    onChange={(e) =>
                      setNewQuestion({
                        ...newQuestion,
                        required: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <label className="text-white">Required</label>
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  {editingQuestion ? "Update Question" : "Add Question"}
                </button>
                {editingQuestion && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewQuestion({ title: "", required: true });
                      setEditingQuestion(null);
                    }}
                    className="ml-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">
                Final Questionnaire
              </h2>
              <div className="space-y-2">
                {questionnaires.map((question) => (
                  <div
                    key={question.id}
                    className="flex items-center justify-between bg-gray-700 p-4 rounded"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">
                        {question.title}
                      </h3>
                      <p className="text-gray-300">
                        {question.required ? "Required" : "Optional"}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditQuestion(question)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(question)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">Confirm Delete</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{selectedInstruction?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedInstruction(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <CredentialManager
        isOpen={isCredentialModalOpen}
        setIsOpen={setIsCredentialModalOpen}
      />
    </div>
  );
};

export default AdminPanel;
