'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useSlack } from '@/hooks/useSlack';
import { useCreateSender, useSenders } from '@/hooks/useSenders';
import { Button } from '@/components/ui/Button';
import { Mail, Plus, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const {
    data: slack,
    isLoading: isSlackLoading,
    connect,
    disconnect,
    isDisconnecting,
  } = useSlack();

  const {
    data: senders,
    isLoading: isSendersLoading,
  } = useSenders();

  const createSender = useCreateSender();

  const [showSenderForm, setShowSenderForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleCreateSender = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      return;
    }

    createSender.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        useEthereal: true,
      },
      {
        onSuccess: () => {
          setName('');
          setEmail('');
          setShowSenderForm(false);
        },
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      <Header title="Settings" />

      <div className="p-8 max-w-4xl space-y-6">

        {/* Integrations */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Integrations
            </h2>

            <p className="text-sm text-gray-500">
              Connect your tools to ReachInbox.
            </p>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center p-2">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg"
                  alt="Slack"
                  className="w-8 h-8"
                />
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  Slack
                </h3>

                <p className="text-sm text-gray-500">
                  {slack?.connected
                    ? `Connected to ${slack.teamName}`
                    : 'Receive notifications in your workspace'}
                </p>
              </div>
            </div>

            {!isSlackLoading && (
              slack?.connected ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => disconnect()}
                  isLoading={isDisconnecting}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connect}
                >
                  Connect
                </Button>
              )
            )}
          </div>
        </div>

        {/* Senders */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Senders
              </h2>

              <p className="text-sm text-gray-500">
                Configure the email addresses used to send campaigns.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSenderForm(!showSenderForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sender
            </Button>
          </div>

          {/* Add sender form */}
          {showSenderForm && (
            <form
              onSubmit={handleCreateSender}
              className="p-6 border-b border-gray-100 bg-gray-50"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sender Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ReachInbox"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sender Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sender@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                This assessment demo uses Ethereal test SMTP. Messages are captured in a preview inbox and are not delivered to real recipients.
              </p>

              <div className="flex gap-3 mt-5">
                <Button
                  type="submit"
                  isLoading={createSender.isPending}
                >
                  Add Sender
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSenderForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Sender list */}
          <div className="divide-y divide-gray-100">
            {isSendersLoading ? (
              <div className="p-6 text-sm text-gray-500">
                Loading senders...
              </div>
            ) : !senders || senders.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="w-10 h-10 mx-auto text-gray-300 mb-3" />

                <p className="text-sm font-medium text-gray-700">
                  No senders configured
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Add a sender to start scheduling emails.
                </p>
              </div>
            ) : (
              senders.map((sender) => (
                <div
                  key={sender.id}
                  className="p-5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>

                    <div>
                      <p className="font-medium text-gray-900">
                        {sender.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        {sender.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete sender"
                    disabled
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}