from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .permissions import IsAdminRole
from .serializers import AdminUserSerializer, LoginSerializer, ProfileSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"success": True, "message": "Account created successfully.", "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer


class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ProfileView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by("-created_at")


class UserAdminDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminRole]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()
    http_method_names = ["get", "patch", "head", "options"]