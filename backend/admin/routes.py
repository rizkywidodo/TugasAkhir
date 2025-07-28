#backend/admin/routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from ml.routes import get_available_models, add_model, remove_model
from models import User, db
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

def require_admin():
    """Check if user is admin"""
    current_user_id = get_jwt_identity()
    print(f"JWT Identity: {current_user_id} (type: {type(current_user_id)})")
    
    if not current_user_id:
        return None, jsonify({"error": "Invalid token"}), 401
    
    user = User.query.get(int(current_user_id)) if current_user_id.isdigit() else None
    if not user:
        return None, jsonify({"error": "User not found"}), 401
    
    if user.role != 'ADMIN':
        return None, jsonify({"error": "Access denied - Admin only"}), 403
    
    return user, None, None

@admin_bp.route('/models', methods=['GET'])
@cross_origin()
@jwt_required()
def get_models():
    """Get all AI models"""
    try:
        user, error_response, status_code = require_admin()
        if error_response:
            return error_response, status_code
        
        print(f"User accessing models: {user.name} ({user.role})")
        
        models = get_available_models()
        
        # Format models for frontend
        formatted_models = []
        for model in models:
            if isinstance(model, dict):
                formatted_models.append({
                    "id": model.get('id', model.get('name', '')),
                    "name": model.get('name', ''),
                    "huggingfaceUrl": model.get('huggingfaceUrl', model.get('model_name', '')),
                    "uploadedBy": model.get('uploadedBy', user.name),
                    "uploadedAt": model.get('uploadedAt', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                })
            else:
                # Model is string (model name)
                formatted_models.append({
                    "id": str(model),
                    "name": str(model),
                    "huggingfaceUrl": str(model),
                    "uploadedBy": user.name,
                    "uploadedAt": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
        
        return jsonify({
            "status": "success",
            "models": formatted_models,
            "count": len(formatted_models)
        })
        
    except Exception as e:
        print(f"Error in get_models: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/models', methods=['POST'])
@cross_origin()
@jwt_required()
def add_new_model():
    """Add new AI model"""
    try:
        user, error_response, status_code = require_admin()
        if error_response:
            return error_response, status_code
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        model_name = data.get('model_name')
        if not model_name:
            return jsonify({"error": "model_name is required"}), 400
        
        print(f"Adding model: {model_name} by user: {user.name}")
        
        if add_model(model_name):
            return jsonify({
                "status": "success",
                "message": "Model added successfully",
                "model_name": model_name,
                "total_models": len(get_available_models())
            }), 201
        else:
            return jsonify({
                "status": "error",
                "error": "Model already exists or failed to add"
            }), 400
            
    except Exception as e:
        print(f"Error in add_new_model: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/models/<path:model_name>', methods=['DELETE'])
@cross_origin()
@jwt_required()
def delete_model(model_name):
    """Delete AI model"""
    try:
        user, error_response, status_code = require_admin()
        if error_response:
            return error_response, status_code
        
        print(f"Deleting model: {model_name} by user: {user.name}")
        
        if remove_model(model_name):
            return jsonify({
                "status": "success",
                "message": "Model deleted successfully",
                "total_models": len(get_available_models())
            })
        else:
            return jsonify({
                "status": "error",
                "error": "Model not found"
            }), 404
            
    except Exception as e:
        print(f"Error in delete_model: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users', methods=['GET'])
@cross_origin()
@jwt_required()
def get_users():
    """Get all users"""
    try:
        user, error_response, status_code = require_admin()
        if error_response:
            return error_response, status_code
        
        users = User.query.all()
        
        return jsonify({
            "status": "success",
            "users": [{
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role
            } for user in users],
            "count": len(users)
        })
        
    except Exception as e:
        print(f"Error in get_users: {str(e)}")
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['PUT'])
@cross_origin()
@jwt_required()
def update_user(user_id):
    """Update user details"""
    try:
        current_user, error_response, status_code = require_admin()
        if error_response:
            return error_response, status_code
        
        user_to_update = User.query.get(int(user_id))
        if not user_to_update:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Prevent admin from changing their own role to non-admin
        if str(current_user.id) == str(user_id) and data.get('role') != 'ADMIN':
            return jsonify({"error": "Cannot change your own admin role"}), 400
        
        # Update user fields
        if 'name' in data:
            user_to_update.name = data['name']
        if 'role' in data and data['role'] in ['ADMIN', 'Peneliti']:
            user_to_update.role = data['role']
        
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "User updated successfully",
            "user": {
                "id": str(user_to_update.id),
                "name": user_to_update.name,
                "email": user_to_update.email,
                "role": user_to_update.role
            }
        })
        
    except Exception as e:
        print(f"Error in update_user: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@cross_origin()
@jwt_required()
def delete_user(user_id):
    """Delete user"""
    try:
        current_user, error_response, status_code = require_admin()
        if error_response:
            return error_response, status_code
        
        # Prevent self-deletion
        if str(current_user.id) == str(user_id):
            return jsonify({"error": "Cannot delete your own account"}), 400
        
        user_to_delete = User.query.get(int(user_id))
        if not user_to_delete:
            return jsonify({"error": "User not found"}), 404
        
        # Store user info before deletion
        deleted_user_info = {
            "id": str(user_to_delete.id),
            "name": user_to_delete.name,
            "email": user_to_delete.email,
            "role": user_to_delete.role
        }
        
        db.session.delete(user_to_delete)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "User deleted successfully",
            "deleted_user": deleted_user_info
        })
        
    except Exception as e:
        print(f"Error in delete_user: {str(e)}")
        db.session.rollback()
        return jsonify({"error": str(e)}), 500