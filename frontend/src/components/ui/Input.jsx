import React from 'react';

function Input({ label, ...props }) {
  return (
    <div className="form-group">
      {label && <label htmlFor={props.id}>{label}</label>}
      <input {...props} />
    </div>
  );
}

export default Input;