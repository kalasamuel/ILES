import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { placementsAPI } from '../services/endpoints';
import './PlacementsPage.css'

function PlacementList() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlacements = async () => {
      try {
        const data = await placementsAPI.getPlacements();
        setPlacements(data.results || data || []);
      } catch (error) {
        console.error('Failed to fetch placements', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlacements();
  }, []);

  if (loading) return <p>Loading placements...</p>;

  return (
    <div>
      <h2>Placements</h2>
      {placements.length === 0 ? (
        <p>No placements found.</p>
      ) : (
        <ul>
          {placements.map((placement) => (
            <li key={placement.placement_id}>
              {placement.position_title} - {placement.organization_details?.name || 'Organization'}
              <span style={{ marginLeft: '0.5rem' }}>({placement.status})</span>
            </li>
          ))}
        </ul>
      )}
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
  const { id } = useParams();
  const [placement, setPlacement] = useState(null);

  useEffect(() => {
    const fetchPlacement = async () => {
      try {
        const data = await placementsAPI.getPlacement(id);
        setPlacement(data);
      } catch (error) {
        console.error('Failed to fetch placement', error);
      }
    };

    if (id) fetchPlacement();
  }, [id]);

  return (
    <div>
      <h2>Placement Details</h2>
      {!placement ? (
        <p>Loading placement details...</p>
      ) : (
        <div>
          <p>Position: {placement.position_title}</p>
          <p>Status: {placement.status}</p>
          <p>Start Date: {placement.start_date}</p>
          <p>End Date: {placement.end_date}</p>
        </div>
      )}
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