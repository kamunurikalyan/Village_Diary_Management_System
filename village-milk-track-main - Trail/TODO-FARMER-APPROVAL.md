# Farmer Approval Feature Implementation Plan

## Information Gathered:

1. **AuthContext.tsx**: 
   - Handles Firebase authentication
   - Creates user document in 'users' collection with role 'farmer' by default
   - Fetches user role from Firestore on login
   - Currently allows any registered farmer to login

2. **Auth.tsx**:
   - Registration form for farmers
   - Currently creates user document with role 'farmer' directly
   - No approval mechanism exists

3. **AdminDashboard.tsx**:
   - Shows list of farmers (queryDocuments with role='farmer')
   - Can create new admins
   - No farmer approval functionality yet

4. **ProtectedRoute.tsx**:
   - Checks user and userRole
   - Routes based on role

## Plan:

### Step 1: Modify Auth.tsx (Registration)
- When a farmer registers, add `isApproved: false` and `status: 'pending'` to the user document
- Show message after registration that says "Your account is pending approval by admin"

### Step 2: Modify AuthContext.tsx (Login)
- Check if farmer's account is approved during login
- If `isApproved: false`, sign them out and throw an error "Your account is pending approval"

### Step 3: Modify AdminDashboard.tsx
- Add a section/tab to view pending farmer registrations
- Query only farmers where `isApproved: false` and `status: 'pending'`
- Add Approve and Reject buttons for each pending farmer
- When approved, update user document with `isApproved: true` and `status: 'approved'`
- When rejected, update user document with `isApproved: false` and `status: 'rejected'`

### Step 4: Modify AdminDashboard.tsx farmer list
- Filter out pending farmers from the main farmer list
- Show only approved farmers

## Files to be edited:
1. `src/pages/Auth.tsx` - Add pending status on registration
2. `src/contexts/AuthContext.tsx` - Check approval status on login
3. `src/pages/AdminDashboard.tsx` - Add farmer approval UI and functionality

## Followup steps:
- Test farmer registration flow
- Test admin approval flow
- Test farmer login after approval
