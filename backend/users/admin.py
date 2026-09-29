from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "name", "role", "is_active", "created_at")
    fieldsets = ((None, {"fields": ("email", "password")}), ("Profile", {"fields": ("name", "phone", "role", "profile_image")}), ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}))
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "name", "password1", "password2", "role", "is_staff", "is_superuser")} ),)
    search_fields = ("email", "name")