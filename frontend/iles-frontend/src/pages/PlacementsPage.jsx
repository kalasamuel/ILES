import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Placeholder components - these should be moved to features/placements/pages/
function PlacementList() {
  return (
    <div>
      <h2>Placement List</h2>
      <p>List of all placements</p>
    </div>
  );
}

function PlacementCreate() {
  return (
    <div>
      <h2>Create Placement</h2>
      <p>Form to create new placement</p>
    </div>
  );
}

function PlacementDetails() {
  return (
    <div>
      <h2>Placement Details</h2>
      <p>Details of a specific placement</p>
    </div>
  );
}

function PlacementsPage() {
  return (
    <Routes>
      <Route index element={<PlacementList />} />
      <Route path="create" element={<PlacementCreate />} />
      <Route path=":id" element={<PlacementDetails />} />
    </Routes>
  );
}

export default PlacementsPage;