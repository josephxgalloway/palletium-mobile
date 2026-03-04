import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Alias route for cross-platform deep-link compatibility.
 * Canonical mobile path is /playlist/:id.
 */
export default function PlaylistsAliasRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return <Redirect href="/(tabs)/library" />;
  }

  return (
    <Redirect
      href={{
        pathname: '/playlist/[id]',
        params: { id: String(id) },
      }}
    />
  );
}
