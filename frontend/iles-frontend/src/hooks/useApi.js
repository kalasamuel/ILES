import { useState, useEffect, useRef } from 'react';

export function useApi(apiCall, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiCallRef = useRef(apiCall);

  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  // Consumers explicitly control dependencies for this reusable hook.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiCallRef.current();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);
  /* eslint-enable react-hooks/exhaustive-deps */

  const refetch = () => {
    setLoading(true);
    setError(null);
    apiCallRef.current()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  return { data, loading, error, refetch };
}