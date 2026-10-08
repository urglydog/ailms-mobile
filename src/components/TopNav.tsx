import { router, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/cart';
import { useAuth } from '@/lib/auth/AuthContext';

export function TopNav() {
  const { isAuthenticated } = useAuth();
  
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.list(),
    enabled: isAuthenticated === true,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#2563EB', letterSpacing: -0.5 }}>ai<Text style={{ color: '#0F172A' }}>lms.</Text></Text>
      
      {isAuthenticated && (
        <Pressable
          onPress={() => router.push('/cart' as Href)}
          style={{ padding: 8, justifyContent: 'center', alignItems: 'center' }}
        >
          <View>
            <ShoppingCart size={24} color="#475569" />
            {cart && cart.length > 0 && (
              <View style={{ position: 'absolute', top: -6, right: -8, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{cart.length}</Text>
              </View>
            )}
          </View>
        </Pressable>
      )}
    </View>
  );
}
