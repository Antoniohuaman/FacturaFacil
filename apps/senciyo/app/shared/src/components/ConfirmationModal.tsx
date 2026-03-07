import React from 'react';

interface ConfirmationModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	clientName?: string; // Nuevo prop para el nombre del cliente
	onConfirm: () => void;
	onCancel: () => void;
	confirmText?: string;
	cancelText?: string;
	confirmButtonStyle?: 'danger' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	title,
	message,
	clientName,
	onConfirm,
	onCancel,
	confirmText = 'Confirmar',
	cancelText = 'Cancelar',
	confirmButtonStyle = 'primary'
}) => {
	if (!isOpen) return null;

	const getConfirmButtonClasses = () => {
		const baseClasses = "px-6 py-2 text-sm font-medium rounded-lg transition-colors";
		
		if (confirmButtonStyle === 'danger') {
			return `${baseClasses} bg-red-500 text-white hover:bg-red-600`;
		}
		
		return `${baseClasses} text-white hover:opacity-90`;
	};

	const getConfirmButtonStyle = () => {
		if (confirmButtonStyle === 'primary') {
			return { backgroundColor: '#0040A2' }; // COLOR PRIMARIO
		}
		return {};
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 relative">
				{/* Close X button */}
				<button
					onClick={onCancel}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
				>
					×
				</button>
				
				{/* Content */}
				<div className="p-6 pt-8">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
					{clientName ? (
						<p className="text-gray-600 text-sm leading-relaxed mb-6">
							{message.split(clientName)[0]}
							<span className="font-semibold">{clientName}</span>
							{message.split(clientName)[1]}
						</p>
					) : (
						<p className="text-gray-600 text-sm leading-relaxed mb-6">{message}</p>
					)}
					
					{/* Buttons */}
					<div className="flex justify-end gap-3">
						<button
							onClick={onCancel}
							className="px-6 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							{cancelText}
						</button>
						<button
							onClick={onConfirm}
							className={getConfirmButtonClasses()}
							style={getConfirmButtonStyle()}
						>
							{confirmText}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ConfirmationModal;