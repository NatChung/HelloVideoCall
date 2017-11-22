//
//  ProviderDelegate.m
//  HelloVideoCall
//
//  Created by Jeffrey on 2017/11/22.
//  Copyright © 2017年 Facebook. All rights reserved.
//

#import "ProviderDelegate.h"
#import <UIKit/UIKit.h>


@implementation ProviderDelegate

// GETTER DEFINATION
+(CXProviderConfiguration *)providerConfiguration {
  providerConfiguration = [[CXProviderConfiguration alloc] initWithLocalizedName:@"HelloVideoCall"];
  providerConfiguration.supportsVideo = YES;
  providerConfiguration.maximumCallGroups = 1;
  providerConfiguration.iconTemplateImageData = UIImagePNGRepresentation([UIImage imageNamed:@"video_call.png"]);
  providerConfiguration.ringtoneSound = @"ring.caf";
  return providerConfiguration;
}

-(instancetype)init {
  self = [super init];
  if (self) {
    self.provider = [[CXProvider alloc] initWithConfiguration:[ProviderDelegate providerConfiguration]];
    [self.provider setDelegate:self queue:nil];
  }
  return self;
}

-(void)displayIncomingCall:(NSUUID *)uuid handle:(NSString *)handle hasVideo:(BOOL)flag withCompletion:(void(^)(NSError *error))completion {
  CXCallUpdate *update = [[CXCallUpdate alloc] init];
  update.remoteHandle = [[CXHandle alloc] initWithType:CXHandleTypePhoneNumber value:handle];
  update.hasVideo = flag;
  [self.provider reportNewIncomingCallWithUUID:uuid update:update completion:^(NSError * _Nullable error) {
    completion(error);
  }];
}
-(void)providerDidBegin:(CXProvider *)provider {
  self.providerTimer = [NSTimer scheduledTimerWithTimeInterval:15.0 target:self selector:@selector(performSomeAction:) userInfo:nil repeats:NO];
}
-(void)providerDidReset:(CXProvider *)provider {
  NSLog(@"Provider did reset");
  /* End any ongoing calls if the provider resets, and remove them from the app’s list of calls, since they are no longer valid.*/
}
-(void)provider:(CXProvider *)provider performAnswerCallAction:(CXStartCallAction *)action {
  /* Perform your action after accepting the call */
}
- (void)provider:(CXProvider *)provider performEndCallAction:(CXEndCallAction *)action {
  /* Perform your action after ending the call */
}
- (void)provider:(CXProvider *)provider performSetMutedCallAction:(CXSetMutedCallAction *)action
{
  /*CXSetMutedCallAction is a concrete subclass of CXCallAction that encapsulates the act of muting or unmuting a call.When a caller mutes a call, that caller is unable to communicate with other callers until they unmute the call. A muted caller still receives communication from other unmuted callers.*/
}
- (void)provider:(CXProvider *)provider performSetGroupCallAction:(CXSetMutedCallAction *)action {
  /*CXSetGroupCallAction is a concrete subclass of CXCallAction that encapsulates the act of grouping or ungrouping calls.A group call allows more than two recipients to simultaneously communicate with one another. */
}
- (void)provider:(CXProvider *)provider performSetHeldCallAction:(CXSetHeldCallAction *)action {
  /* CXSetHeldCallAction is a concrete subclass of CXCallAction that encapsulates the act of placing a call on hold or removing a call from hold. When a caller places the call on hold, callers are unable to communicate with one another until the holding caller removes the call from hold. Placing a call on hold doesn’t end the call. */
}
-(void)performSomeAction:(NSTimer *)timer
{
  /* DO YOUR ACTION */
}

@end

