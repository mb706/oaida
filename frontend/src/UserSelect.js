// UserSelect.js
import React from 'react';

const UserSelect = ({ selectedUser, setSelectedUser, users }) => {
  const handleChange = (event) => {
    setSelectedUser(event.target.value);
  };

  return (
    <select value={selectedUser} onChange={handleChange}>
      <option value="">All Users</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </select>
  );
};

export default UserSelect;
