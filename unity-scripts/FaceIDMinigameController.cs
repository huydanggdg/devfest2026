using System;
using UnityEngine;
using UnityEngine.Events;

namespace OfficePrankster.Minigames.FaceID
{
    [Serializable]
    public struct FacialExpressionProfile
    {
        public string ExpressionName;
        [Range(0f, 100f)] public float Smile_Q;
        [Range(0f, 100f)] public float Cry_W;
        [Range(0f, 100f)] public float CoolBrow_E;
        [Range(0f, 100f)] public float WinkPuff_R;
    }

    /// <summary>
    /// Quản lý Minigame Chấm công Khuôn mặt 3D (Face-ID Check-in) ở sảnh lễ tân.
    /// Điều khiển SkinnedMeshRenderer BlendShapes qua các phím Q, W, E, R.
    /// </summary>
    public class FaceIDMinigameController : MonoBehaviour
    {
        [Header("=== 1. Tham chiếu Nhân vật & Camera ===")]
        [SerializeField] private SkinnedMeshRenderer characterFaceMesh;
        [SerializeField] private GameObject faceIDCamera;
        [SerializeField] private Animator turnstileGateAnimator;

        [Header("=== 2. Chỉ số BlendShape Index trên Model 3D ===")]
        [SerializeField] private int smileBlendIndex = 0;
        [SerializeField] private int cryBlendIndex = 1;
        [SerializeField] private int coolBrowBlendIndex = 2;
        [SerializeField] private int winkPuffBlendIndex = 3;

        [Header("=== 3. Cấu hình Minigame ===")]
        [SerializeField] private FacialExpressionProfile[] dailyTargetExpressions;
        [SerializeField] private float blendSpeed = 160f;
        [SerializeField] private float matchThreshold = 20f;
        [SerializeField] private float requiredHoldDuration = 1.5f;
        [SerializeField] private float timeLimit = 20f;

        [Header("=== 4. Sự kiện (Events) ===")]
        public UnityEvent<string> OnMinigameStarted;
        public UnityEvent<float> OnScanProgressUpdated;
        public UnityEvent OnCheckInSuccess;
        public UnityEvent OnCheckInFailed;

        private FacialExpressionProfile _currentTarget;
        private FacialExpressionProfile _currentPlayerFace;
        private bool _isMinigameActive;
        private float _currentHoldTimer;
        private float _remainingTime;

        private static readonly int OpenGateHash = Animator.StringToHash("OpenGate");

        public void StartFaceIDCheckIn()
        {
            if (_isMinigameActive || dailyTargetExpressions.Length == 0) return;

            int randomIndex = UnityEngine.Random.Range(0, dailyTargetExpressions.Length);
            _currentTarget = dailyTargetExpressions[randomIndex];

            _currentPlayerFace = new FacialExpressionProfile();
            _currentHoldTimer = 0f;
            _remainingTime = timeLimit;
            _isMinigameActive = true;

            if (faceIDCamera != null) faceIDCamera.SetActive(true);
            OnMinigameStarted?.Invoke(_currentTarget.ExpressionName);
        }

        private void Update()
        {
            if (!_isMinigameActive) return;

            _remainingTime -= Time.deltaTime;
            if (_remainingTime <= 0f)
            {
                HandleCheckInResult(false);
                return;
            }

            UpdateFacialMuscleInput();
            ApplyBlendShapesToMesh();
            EvaluateExpressionMatch();
        }

        private void UpdateFacialMuscleInput()
        {
            float targetQ = Input.GetKey(KeyCode.Q) ? 100f : 0f;
            float targetW = Input.GetKey(KeyCode.W) ? 100f : 0f;
            float targetE = Input.GetKey(KeyCode.E) ? 100f : 0f;
            float targetR = Input.GetKey(KeyCode.R) ? 100f : 0f;

            float step = blendSpeed * Time.deltaTime;
            _currentPlayerFace.Smile_Q    = Mathf.MoveTowards(_currentPlayerFace.Smile_Q, targetQ, step);
            _currentPlayerFace.Cry_W      = Mathf.MoveTowards(_currentPlayerFace.Cry_W, targetW, step);
            _currentPlayerFace.CoolBrow_E = Mathf.MoveTowards(_currentPlayerFace.CoolBrow_E, targetE, step);
            _currentPlayerFace.WinkPuff_R = Mathf.MoveTowards(_currentPlayerFace.WinkPuff_R, targetR, step);
        }

        private void ApplyBlendShapesToMesh()
        {
            if (characterFaceMesh == null) return;
            characterFaceMesh.SetBlendShapeWeight(smileBlendIndex, _currentPlayerFace.Smile_Q);
            characterFaceMesh.SetBlendShapeWeight(cryBlendIndex, _currentPlayerFace.Cry_W);
            characterFaceMesh.SetBlendShapeWeight(coolBrowBlendIndex, _currentPlayerFace.CoolBrow_E);
            characterFaceMesh.SetBlendShapeWeight(winkPuffBlendIndex, _currentPlayerFace.WinkPuff_R);
        }

        private void EvaluateExpressionMatch()
        {
            float diffQ = Mathf.Abs(_currentPlayerFace.Smile_Q - _currentTarget.Smile_Q);
            float diffW = Mathf.Abs(_currentPlayerFace.Cry_W - _currentTarget.Cry_W);
            float diffE = Mathf.Abs(_currentPlayerFace.CoolBrow_E - _currentTarget.CoolBrow_E);
            float diffR = Mathf.Abs(_currentPlayerFace.WinkPuff_R - _currentTarget.WinkPuff_R);

            float averageError = (diffQ + diffW + diffE + diffR) / 4f;

            if (averageError <= matchThreshold)
            {
                _currentHoldTimer += Time.deltaTime;
                OnScanProgressUpdated?.Invoke(Mathf.Clamp01(_currentHoldTimer / requiredHoldDuration));

                if (_currentHoldTimer >= requiredHoldDuration)
                {
                    HandleCheckInResult(true);
                }
            }
            else
            {
                _currentHoldTimer = Mathf.Max(0f, _currentHoldTimer - Time.deltaTime * 0.8f);
                OnScanProgressUpdated?.Invoke(Mathf.Clamp01(_currentHoldTimer / requiredHoldDuration));
            }
        }

        private void HandleCheckInResult(bool success)
        {
            _isMinigameActive = false;
            if (faceIDCamera != null) faceIDCamera.SetActive(false);

            if (success)
            {
                if (turnstileGateAnimator != null) turnstileGateAnimator.SetTrigger(OpenGateHash);
                OnCheckInSuccess?.Invoke();
            }
            else
            {
                _currentPlayerFace = new FacialExpressionProfile();
                ApplyBlendShapesToMesh();
                OnCheckInFailed?.Invoke();
            }
        }
    }
}
