import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto border border-border rounded-[18px] bg-white">
      <table className={`w-full border-collapse min-w-[760px] ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <thead className={`bg-[#f7f9fc] ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '', ...props }) {
  return (
    <tbody className={`divide-y divide-border ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={`hover:bg-[#fbfcfe] transition-colors ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th
      className={`px-4 py-3.5 text-right align-middle text-[0.96rem] font-extrabold text-secondary whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td
      className={`px-4 py-3.5 text-right align-middle text-[0.96rem] border-b border-[#edf2f7] ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export default Table;
