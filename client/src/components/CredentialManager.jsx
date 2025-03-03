import { Dialog } from "@headlessui/react";
import { useState } from "react";

const API_URL = "http://localhost:5000/api";

const CredentialManager = ({ isOpen, setIsOpen }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (credentials.newPassword !== credentials.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/change-credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          currentPassword: credentials.currentPassword,
          newPassword: credentials.newPassword,
          newUsername: credentials.username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update credentials");
      }

      setSuccess("Credentials updated successfully");
      setCredentials({
        username: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        setIsOpen(false);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-gray-800 p-6">
          <Dialog.Title className="text-lg font-medium text-white">
            Change Credentials
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                New Username
              </label>
              <input
                type="text"
                id="username"
                value={credentials.username}
                onChange={(e) =>
                  setCredentials({ ...credentials, username: e.target.value })
                }
                className="mt-1 px-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-300"
              >
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={credentials.currentPassword}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    currentPassword: e.target.value,
                  })
                }
                className="mt-1 px-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-300"
              >
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={credentials.newPassword}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    newPassword: e.target.value,
                  })
                }
                className="mt-1 px-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300"
              >
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={credentials.confirmPassword}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    confirmPassword: e.target.value,
                  })
                }
                className="mt-1 px-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>

            {error && (
              <div className="text-center text-sm text-red-500">{error}</div>
            )}
            {success && (
              <div className="text-center text-sm text-green-500">
                {success}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Update Credentials
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CredentialManager;
