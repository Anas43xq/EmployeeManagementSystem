import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
};

function Modal({ show, onClose, children, size = 'md' }: ModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface HeaderProps {
  children: ReactNode;
  onClose: () => void;
}

function Header({ children, onClose }: HeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 shrink-0">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-2">{children}</h2>
      <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
}

interface BodyProps {
  children: ReactNode;
  className?: string;
}

function Body({ children, className = '' }: BodyProps) {
  return (
    <div className={`p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

interface FooterProps {
  children: ReactNode;
}

function Footer({ children }: FooterProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2 sm:gap-3 px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
      {children}
    </div>
  );
}

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
