import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '../../lib/http'
import './TestInfra.css'

/**
 * Infrastructure Test Page
 * Tests MSW, React Query, and HTTP client integration
 */
function TestInfra() {
  const queryClient = useQueryClient()

  // Test 1: Fetch member profile
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['member', 'profile'],
    queryFn: () => http.get('/api/member/profile')
  })

  // Test 2: Fetch addresses
  const {
    data: addresses,
    isLoading: addressesLoading,
    error: addressesError
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => http.get('/api/addresses', {
      params: { member_id: 1 }
    })
  })

  // Test 3: Fetch orders
  const {
    data: orders,
    isLoading: ordersLoading,
    error: ordersError
  } = useQuery({
    queryKey: ['orders'],
    queryFn: () => http.get('/api/orders', {
      params: { member_id: 1, page: 1, limit: 10 }
    })
  })

  // Test 4: Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => http.put('/api/member/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', 'profile'] })
      alert('Profile updated successfully!')
    },
    onError: (error) => {
      alert(`Failed to update profile: ${error.message}`)
    }
  })

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      member_nickname: 'Updated Nickname',
      member_marketing_email: true
    })
  }

  return (
    <div className="test-infra-page">
      <h1>Infrastructure Test Page</h1>
      <p>Testing MSW, React Query, and HTTP client integration</p>

      <div className="test-sections">
        {/* Test 1: Member Profile */}
        <section className="test-section">
          <h2>Test 1: Member Profile</h2>
          {profileLoading && <p>Loading profile...</p>}
          {profileError && <p className="error">Error: {profileError.message}</p>}
          {profile && (
            <div className="test-result">
              <pre>{JSON.stringify(profile, null, 2)}</pre>
              <button onClick={handleUpdateProfile}>
                Update Profile
              </button>
            </div>
          )}
        </section>

        {/* Test 2: Addresses */}
        <section className="test-section">
          <h2>Test 2: Addresses</h2>
          {addressesLoading && <p>Loading addresses...</p>}
          {addressesError && <p className="error">Error: {addressesError.message}</p>}
          {addresses && (
            <div className="test-result">
              <pre>{JSON.stringify(addresses, null, 2)}</pre>
            </div>
          )}
        </section>

        {/* Test 3: Orders */}
        <section className="test-section">
          <h2>Test 3: Orders</h2>
          {ordersLoading && <p>Loading orders...</p>}
          {ordersError && <p className="error">Error: {ordersError.message}</p>}
          {orders && (
            <div className="test-result">
              <pre>{JSON.stringify(orders, null, 2)}</pre>
            </div>
          )}
        </section>
      </div>

      <div className="test-info">
        <h3>What to check:</h3>
        <ul>
          <li>✅ MSW intercepts API calls (check console for [MSW] logs)</li>
          <li>✅ React Query DevTools appears in bottom-left corner</li>
          <li>✅ Data loads with simulated delay (300-1200ms)</li>
          <li>✅ Zod validation works (data structure is correct)</li>
          <li>✅ Error handling works (try refreshing multiple times for 10% error rate)</li>
          <li>✅ Mutation updates cache automatically</li>
        </ul>
      </div>
    </div>
  )
}

export default TestInfra
