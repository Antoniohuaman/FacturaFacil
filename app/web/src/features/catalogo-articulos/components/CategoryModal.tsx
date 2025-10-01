import React, { useState } from 'react';
// import eliminado porque no se usa

interface CategoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (data: { nombre: string; descripcion?: string; color: string }) => void;
	colors: { name: string; value: string }[];
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, colors }) => {
	const [nombre, setNombre] = useState('');
	const [descripcion, setDescripcion] = useState('');
	const [color, setColor] = useState(colors[0]?.value || '#3b82f6');
	const [error, setError] = useState('');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!nombre.trim()) {
			setError('El nombre es requerido');
			return;
		}
		onSave({ nombre, descripcion, color });
		setNombre('');
		setDescripcion('');
		setColor(colors[0]?.value || '#3b82f6');
		setError('');
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-50">
			<div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
				<h2 className="text-lg font-bold mb-4">Nueva categoría</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
						<input
							type="text"
							value={nombre}
							onChange={e => setNombre(e.target.value)}
							className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
							placeholder="Nombre de la categoría"
						/>
						{error && <p className="text-red-600 text-xs mt-1">{error}</p>}
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
						<textarea
							value={descripcion}
							onChange={e => setDescripcion(e.target.value)}
							className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
							placeholder="Descripción opcional"
							rows={2}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
						<div className="grid grid-cols-4 gap-2 mt-2">
							{colors.map(c => (
								<button
									type="button"
									key={c.value}
									className={`h-10 rounded-md border-2 transition-colors ${color === c.value ? 'border-blue-600' : 'border-transparent'}`}
									style={{ backgroundColor: c.value }}
									onClick={() => setColor(c.value)}
								/>
							))}
						</div>
					</div>
					<div className="flex justify-end space-x-2 mt-6">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md hover:opacity-90"
							style={{ backgroundColor: '#1478D4' }}
						>
							Crear
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default CategoryModal;
