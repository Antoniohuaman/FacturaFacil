import React from 'react';

interface EmailsInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  maxEmails?: number;
}

const EmailsInput: React.FC<EmailsInputProps> = ({ emails, onChange, maxEmails = 3 }) => {
  const handleAdd = () => {
    if (emails.length < maxEmails) {
      onChange([...emails, '']);
    }
  };

  const handleRemove = (index: number) => {
    onChange(emails.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {emails.map((email, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={`Correo electrónico ${index + 1}`}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
      {emails.length < maxEmails && (
        <button
          type="button"
          onClick={handleAdd}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          + Agregar correo
        </button>
      )}
    </div>
  );
};

export default EmailsInput;
