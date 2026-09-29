import re
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "name", "email", "phone", "role", "profile_image", "is_active", "created_at")
        read_only_fields = ("id", "email", "role", "is_active", "created_at")


class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("name", "email", "phone", "password", "confirm_password")
        extra_kwargs = {"password": {"write_only": True}}

    def validate_phone(self, value):
        if value and not re.fullmatch(r"\+?[0-9 ()-]{7,20}", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data, role=User.Role.CITIZEN)


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("name", "phone", "profile_image")

    def validate_phone(self, value):
        if value and not re.fullmatch(r"\+?[0-9 ()-]{7,20}", value):
            raise serializers.ValidationError("Enter a valid phone number.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "name", "email", "phone", "role", "profile_image", "is_active", "created_at")
        read_only_fields = ("id", "email", "created_at")