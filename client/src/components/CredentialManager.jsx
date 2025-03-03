import { Dialog } from "@headlessui/react";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const CredentialManager = ({ isOpen, setIsOpen }) => {
  const [credentials, setCredentials] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailSettings, setEmailSettings] = useState({
    reportEmail: "",
    rejectionEmail: "",
  });
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (isOpen) {
      const fetchEmailSettings = async () => {
        try {
          const response = await fetch(`${API_URL}/auth/settings`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (response.ok) {
            setEmailSettings({
              reportEmail: data.report_email,
              rejectionEmail: data.rejection_email,
            });
          }
        } catch (error) {
          console.error("Error fetching   gs:", error);
          toast.error("Failed to fetch email settings");
        }
      };

      fetchEmailSettings();
    }
  }, [isOpen, token]);

  const handleEmailSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_email: emailSettings.reportEmail,
          rejection_email: emailSettings.rejectionEmail,
        }),
      });

      if (response.ok) {
        toast.success("Email settings updated successfully");
      } else {
        toast.error("Failed to update email settings");
      }
    } catch (error) {
      console.error("Error updating email settings:", error);
      toast.error("Failed to update email settings");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (credentials.newPassword !== credentials.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: credentials.currentPassword,
          newPassword: credentials.newPassword,
        }),
      });

      if (response.ok) {
        setCredentials({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        toast.success("Password updated successfully");
      } else {
        toast.error("Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
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
          <Dialog.Title className="text-lg font-medium text-white mb-6">
            Admin Settings
          </Dialog.Title>

          <div className="space-y-6">
            {/* Email Settings Form */}
            <form onSubmit={handleEmailSettingsSubmit} className="space-y-4">
              <h3 className="text-md font-medium text-white">Email Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Report Email
                </label>
                <input
                  type="email"
                  value={emailSettings.reportEmail}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      reportEmail: e.target.value,
                    })
                  }
                  className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Rejection Email
                </label>
                <input
                  type="email"
                  value={emailSettings.rejectionEmail}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      rejectionEmail: e.target.value,
                    })
                  }
                  className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Update Email Settings
              </button>
            </form>

            {/* Password Change Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <h3 className="text-md font-medium text-white">Change Password</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Current Password
                </label>
                <input
                  type="password"
                  value={credentials.currentPassword}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      currentPassword: e.target.value,
                    })
                  }
                  className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  New Password
                </label>
                <input
                  type="password"
                  value={credentials.newPassword}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      newPassword: e.target.value,
                    })
                  }
                  className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={credentials.confirmPassword}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="mt-1 p-2 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Update Password
              </button>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CredentialManager;
